import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useCampaignDraft } from "../../context/CampaignDraftContext";
import CampaignWizardLayout from "./CampaignWizardLayout";
import { generateCampaignId, setPendingCampaignToast, upsertCampaign } from "../../services/campaignService";
import StatusBadge from "../../components/ui/StatusBadge";

const RECIPIENT_PREVIEW_PAGE_SIZE = 25;

function toPhoneList(records) {
  return (records || [])
    .map((item) => (item?.phoneNo || item?.phone || "").toString().trim())
    .filter((value) => value.length > 0);
}

function toRecipientPreviewRows(records) {
  return (records || [])
    .map((item, index) => {
      const phone = (item?.phoneNo || item?.phone || "").toString().trim();
      if (!phone) return null;

      return {
        id: `preview:${item?.id ?? "row"}:${index}`,
        name: (item?.name || "").toString().trim() || "-",
        email: (item?.email || "").toString().trim() || "-",
        phone,
        companyName: (item?.companyName || "").toString().trim() || "-",
      };
    })
    .filter(Boolean);
}

function getContactKey(contact) {
  if (contact?.id != null) {
    return `id:${contact.id}`;
  }
  const email = (contact?.email || "").toString().trim().toLowerCase();
  const phone = (contact?.phoneNo || contact?.phone || "").toString().trim();
  const name = (contact?.name || "").toString().trim().toLowerCase();
  return `fp:${email}|${phone}|${name}`;
}

function buildButtonParam(parameterType, value) {
  const normalizedType = (parameterType || "text").toLowerCase();
  if (normalizedType === "payload") {
    return { type: "payload", payload: value };
  }
  if (normalizedType === "coupon_code") {
    return { type: "coupon_code", coupon_code: value };
  }
  return { type: "text", text: value };
}

const AUDIENCE_MODE_LABEL = {
  all_contacts: "Selected Contacts",
  upload_file: "Uploaded File",
  uploaded_file: "Uploaded File",
};

function normalizePhone(value) {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  return raw.replace(/[^0-9]/g, "");
}

function normalizeRecipientStatus(value) {
  const normalized = (value || "").toString().trim().toLowerCase();
  if (!normalized) return "sent";
  if (["failed", "error"].includes(normalized)) return "failed";
  if (["read", "delivered", "sent"].includes(normalized)) return normalized;
  return "sent";
}

function buildRecipientStatuses(recipients, backendResponse) {
  const uniqueRecipients = Array.isArray(recipients) ? recipients : [];
  const recipientResults = Array.isArray(backendResponse?.recipientResults)
    ? backendResponse.recipientResults
    : [];
  const errors = Array.isArray(backendResponse?.errors) ? backendResponse.errors : [];

  const backendByPhone = new Map();
  recipientResults.forEach((item) => {
    const sourcePhone = item?.normalizedTo || item?.to || "";
    const key = normalizePhone(sourcePhone);
    if (!key) return;
    const existing = backendByPhone.get(key);
    if (!existing) {
      backendByPhone.set(key, [item]);
      return;
    }
    existing.push(item);
  });

  const errorsByPhone = new Map();
  errors.forEach((item) => {
    const key = normalizePhone(item?.to || "");
    if (!key || errorsByPhone.has(key)) return;
    errorsByPhone.set(key, item?.error || "Failed to send message.");
  });

  return uniqueRecipients.map((recipient, index) => {
    const normalizedTo = normalizePhone(recipient);
    const indexedResult = recipientResults[index] || null;
    const indexedResultPhone = normalizePhone(indexedResult?.normalizedTo || indexedResult?.to || "");
    const indexedMatchesRecipient = indexedResultPhone && indexedResultPhone === normalizedTo;

    let backendResult = indexedMatchesRecipient ? indexedResult : null;
    if (!backendResult && normalizedTo) {
      const queue = backendByPhone.get(normalizedTo) || [];
      backendResult = queue.length > 0 ? queue.shift() : null;
    }

    const fallbackError = errorsByPhone.get(normalizedTo);
    const status = normalizeRecipientStatus(
      backendResult?.status || (fallbackError ? "failed" : "sent")
    );

    return {
      id: `rcp_${index}_${normalizedTo || index}`,
      to: recipient,
      normalizedTo,
      waMessageId: backendResult?.waMessageId || "",
      status,
      error: backendResult?.error || fallbackError || "",
      updatedAt: new Date().toISOString(),
    };
  });
}

function CampaignReviewStepPage() {
  const navigate = useNavigate();
  const { draft, resetDraft } = useCampaignDraft();
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null);
  const [previewRecipients, setPreviewRecipients] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewPage, setPreviewPage] = useState(1);

  useEffect(() => {
    if (!draft.details.campaignName.trim()) {
      navigate("/app/campaigns/new/details", { replace: true });
      return;
    }
    if (!draft.template.templateName) {
      navigate("/app/campaigns/new/template", { replace: true });
    }
  }, [draft.details.campaignName, draft.template.templateName, navigate]);

  const summaryItems = useMemo(
    () => [
      { label: "Campaign", value: draft.details.campaignName || "-" },
      { label: "Objective", value: draft.details.objective || "-" },
      { label: "Audience Mode", value: AUDIENCE_MODE_LABEL[draft.audience.mode] || draft.audience.mode || "-" },
      { label: "Estimated Recipients", value: draft.audience.estimatedRecipients || 0 },
      { label: "Template", value: draft.template.templateName || "-" },
      { label: "Language", value: draft.template.language || "-" },
    ],
    [draft]
  );

  const selectedContactIdsKey = useMemo(() => {
    const selectedIds = Array.isArray(draft.audience.selectedContactIds) ? draft.audience.selectedContactIds : [];
    return selectedIds.join("||");
  }, [draft.audience.selectedContactIds]);

  useEffect(() => {
    let cancelled = false;

    const loadRecipientPreview = async () => {
      const usesFileAudience = ["upload_file", "uploaded_file"].includes(draft.audience.mode);

      if (usesFileAudience && !draft.audience.fileId) {
        setPreviewRecipients([]);
        setPreviewError("");
        return;
      }

      try {
        setPreviewLoading(true);
        setPreviewError("");

        if (usesFileAudience) {
          const response = await api.get(`/files/${draft.audience.fileId}/user-details`);
          const records = Array.isArray(response?.data?.data) ? response.data.data : [];
          if (!cancelled) {
            setPreviewRecipients(toRecipientPreviewRows(records));
          }
          return;
        }

        const response = await api.get("/user-details");
        const contacts = Array.isArray(response?.data?.data) ? response.data.data : [];
        const selectedIds = new Set(
          Array.isArray(draft.audience.selectedContactIds) ? draft.audience.selectedContactIds : []
        );
        const selectedContacts =
          selectedIds.size === 0 ? contacts : contacts.filter((contact) => selectedIds.has(getContactKey(contact)));

        if (!cancelled) {
          setPreviewRecipients(toRecipientPreviewRows(selectedContacts));
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewRecipients([]);
          setPreviewError(error?.response?.data?.message || "Unable to load recipient preview.");
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadRecipientPreview();

    return () => {
      cancelled = true;
    };
  }, [draft.audience.mode, draft.audience.fileId, selectedContactIdsKey]);

  const filteredPreviewRecipients = useMemo(() => {
    const query = previewSearch.trim().toLowerCase();
    if (!query) {
      return previewRecipients;
    }
    return previewRecipients.filter((recipient) =>
      [recipient.name, recipient.email, recipient.phone, recipient.companyName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [previewRecipients, previewSearch]);

  const totalPreviewPages = Math.max(1, Math.ceil(filteredPreviewRecipients.length / RECIPIENT_PREVIEW_PAGE_SIZE));
  const safePreviewPage = Math.min(previewPage, totalPreviewPages);
  const previewSliceStart = (safePreviewPage - 1) * RECIPIENT_PREVIEW_PAGE_SIZE;
  const previewSliceEnd = previewSliceStart + RECIPIENT_PREVIEW_PAGE_SIZE;
  const paginatedPreviewRecipients = filteredPreviewRecipients.slice(previewSliceStart, previewSliceEnd);

  useEffect(() => {
    setPreviewPage(1);
  }, [previewSearch, previewRecipients.length]);

  const resolveRecipients = async () => {
    const usesFileAudience = ["upload_file", "uploaded_file"].includes(draft.audience.mode);
    if (usesFileAudience && draft.audience.fileId) {
      const response = await api.get(`/files/${draft.audience.fileId}/user-details`);
      return toPhoneList(response?.data?.data || []);
    }
    const response = await api.get("/user-details");
    const contacts = Array.isArray(response?.data?.data) ? response.data.data : [];
    const selectedIds = new Set(
      Array.isArray(draft.audience.selectedContactIds) ? draft.audience.selectedContactIds : []
    );
    if (selectedIds.size === 0) {
      return toPhoneList(contacts);
    }
    const selectedContacts = contacts.filter((contact) => selectedIds.has(getContactKey(contact)));
    return toPhoneList(selectedContacts);
  };

  const finalizeCampaignRecord = ({ status, recipientCount, backendResponse, recipientStatuses, recipients, toast }) => {
    const campaignId = generateCampaignId();
    const campaign = upsertCampaign({
      id: campaignId,
      name: draft.details.campaignName.trim(),
      objective: draft.details.objective,
      scheduleType: draft.details.scheduleType,
      scheduledAt: draft.details.scheduledAt || null,
      audienceMode: draft.audience.mode,
      fileId: draft.audience.fileId || null,
      templateName: draft.template.templateName,
      language: draft.template.language,
      headerFormat: draft.template.headerFormat || "",
      headerText: draft.template.headerText || "",
      mediaId: draft.template.mediaId || "",
      personalizeWithUserData: draft.template.personalizeWithUserData,
      bodyParams: draft.template.bodyParams,
      recipientCount,
      recipients: Array.isArray(recipients) ? recipients : [],
      recipientStatuses: Array.isArray(recipientStatuses) ? recipientStatuses : [],
      status,
      backendResponse: backendResponse || null,
    });
    const nextLocationState =
      toast && (toast.message || toast.title)
        ? {
            campaignToast: {
              tone: toast.tone || "success",
              title: toast.title || "Campaign Updated",
              message: toast.message || "",
            },
          }
        : undefined;
    if (nextLocationState?.campaignToast) {
      setPendingCampaignToast(campaign.id, nextLocationState.campaignToast);
    }
    const targetPath = `/app/campaigns/${campaign.id}`;
    resetDraft();
    if (nextLocationState) {
      navigate(targetPath, { state: nextLocationState });
      window.setTimeout(() => {
        if (window.location.pathname !== targetPath) {
          window.location.assign(targetPath);
        }
      }, 120);
      return;
    }
    navigate(targetPath);
    window.setTimeout(() => {
      if (window.location.pathname !== targetPath) {
        window.location.assign(targetPath);
      }
    }, 120);
  };

  const handleSend = async () => {
    if (!draft.template.templateName) {
      setSendStatus({ tone: "error", text: "Template selection is required." });
      return;
    }

    if (draft.details.scheduleType === "later") {
      const scheduledCount = draft.audience.estimatedRecipients || 0;
      finalizeCampaignRecord({
        status: "scheduled",
        recipientCount: scheduledCount,
        recipientStatuses: [],
        recipients: [],
        toast: {
          tone: "success",
          title: "Campaign Scheduled",
          message:
            scheduledCount > 0
              ? `Campaign scheduled for ${scheduledCount} recipients.`
              : "Campaign scheduled successfully.",
        },
      });
      return;
    }

    try {
      setSending(true);
      setSendStatus(null);
      const recipients = await resolveRecipients();

      if (recipients.length === 0) {
        setSendStatus({ tone: "error", text: "No valid recipient phone numbers were found." });
        return;
      }

      const payload = {
        templateName: draft.template.templateName,
        language: draft.template.language,
        to: recipients,
        personalizeWithUserData: draft.template.personalizeWithUserData,
      };

      const bodyParamCount = Number(draft.template.bodyParamCount || 0);
      const bodyParams = Array.isArray(draft.template.bodyParams) ? draft.template.bodyParams : [];
      if (bodyParamCount > 0) {
        let parameters = [];
        if (draft.template.personalizeWithUserData) {
          parameters.push({ type: "text", text: "{{1}}" });
        }
        const userParams = bodyParams
          .map((value) => (value || "").trim())
          .filter((value) => value.length > 0)
          .map((value) => ({ type: "text", text: value }));
        parameters = [...parameters, ...userParams];
        if (parameters.length > 0) {
          payload.parameters = parameters;
        }
      }

      const headerFormat = (draft.template.headerFormat || "").toUpperCase();
      const hasDynamicTextHeader = headerFormat === "TEXT" && Number(draft.template.headerParamCount || 0) > 0;
      const hasMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);
      let resolvedMediaId = (draft.template.mediaId || "").trim();

      if (hasDynamicTextHeader && (draft.template.headerText || "").trim()) {
        payload.headerFormat = "TEXT";
        payload.headerText = (draft.template.headerText || "").trim();
      } else if (hasMediaHeader) {
        const mediaFile = draft.template.headerMediaFile;
        if (mediaFile instanceof File && !resolvedMediaId) {
          const formData = new FormData();
          formData.append("file", mediaFile);
          const uploadResponse = await api.post("/upload/media", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          const mediaIdFromResponse = uploadResponse?.data?.mediaId;
          if (!mediaIdFromResponse) {
            throw new Error("Media upload succeeded but mediaId is missing in response.");
          }
          resolvedMediaId = String(mediaIdFromResponse).trim();
        }
        if (resolvedMediaId) {
          payload.headerFormat = headerFormat;
          payload.mediaId = resolvedMediaId;
        }
      }

      const templateButtons = Array.isArray(draft.template.templateButtons)
        ? draft.template.templateButtons
        : [];
      const dynamicButtons = templateButtons.filter((button) => Number(button?.paramCount || 0) > 0);
      const flowButtons = templateButtons.filter((button) => (button?.type || "").toUpperCase() === "FLOW");
      const buttonParamInputs = draft.template.buttonParamInputs || {};
      const flowButtonTokens = draft.template.flowButtonTokens || {};

      const dynamicButtonParameters = dynamicButtons
        .map((button) => {
          const key = String(button?.index ?? "");
          const values = (buttonParamInputs[key] || [])
            .map((value) => (value || "").trim())
            .filter((value) => value.length > 0);
          if (values.length === 0) return null;
          return {
            index: String(button.index),
            subType: (button.type || "").toLowerCase(),
            parameters: values.map((value) => buildButtonParam(button.parameterType, value)),
          };
        })
        .filter(Boolean);

      const flowButtonParameters = flowButtons
        .map((button) => {
          const key = String(button?.index ?? "");
          const token = (flowButtonTokens[key] || "").trim();
          if (!token) return null;
          return {
            index: String(button.index),
            subType: "flow",
            flowId: button.flowId || "",
            flowName: button.flowName || "",
            parameters: [
              {
                type: "action",
                action: {
                  flow_token: token,
                },
              },
            ],
          };
        })
        .filter(Boolean);

      const buttonParameters = [...dynamicButtonParameters, ...flowButtonParameters];
      if (buttonParameters.length > 0) {
        payload.buttonParameters = buttonParameters;
      }

      const response = await api.post("/waba/send-template", payload);
      const backendStatus = response?.data?.status || "success";
      const status = backendStatus === "success" ? "sent" : backendStatus === "partial_success" ? "partial" : "failed";
      const sentCount = Number(response?.data?.sent || recipients.length || 0);
      const recipientStatuses = buildRecipientStatuses(recipients, response?.data);
      const firstBackendError =
        Array.isArray(response?.data?.errors) && response.data.errors.length > 0
          ? response.data.errors[0]?.error || ""
          : "";
      const sendMessage =
        status === "sent"
          ? `Campaign sent to ${sentCount} recipients.`
          : firstBackendError || response?.data?.message || "Campaign response received with warnings.";
      const sendToastTone = status === "sent" ? "success" : status === "partial" ? "warn" : "error";

      setSendStatus({
        tone: status === "sent" ? "success" : status === "partial" ? "warning" : "error",
        text: sendMessage,
      });

      finalizeCampaignRecord({
        status,
        recipientCount: sentCount,
        backendResponse: response?.data || null,
        recipientStatuses,
        recipients,
        toast: {
          tone: sendToastTone,
          title:
            status === "sent"
              ? "Campaign Sent"
              : status === "partial"
                ? "Campaign Sent With Warnings"
                : "Campaign Send Failed",
          message: sendMessage,
        },
      });
    } catch (error) {
      console.error("Campaign send failed", error);
      setSendStatus({
        tone: "error",
        text: error?.response?.data?.message || "Failed to send campaign.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <CampaignWizardLayout
      activeStep="review"
      title="Review & Confirm"
      subtitle="Verify campaign details and send."
    >
      <div className="app-grid-3">
        {summaryItems.map((item) => (
          <article key={item.label} className="app-stat">
            <p className="app-stat-label">{item.label}</p>
            <p className="app-stat-value" style={{ fontSize: "0.95rem", marginTop: "0.3rem" }}>
              {item.value}
            </p>
          </article>
        ))}
      </div>

      <div style={{ marginTop: "0.85rem", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.85rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.65rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Recipient Preview</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Search recipients and review quickly without long scrolling.
            </p>
          </div>
          <div style={{ minWidth: "250px", flex: "1 1 250px", maxWidth: "420px" }}>
            <input
              type="text"
              className="app-input"
              placeholder="Search by name, phone, email, company"
              value={previewSearch}
              onChange={(event) => setPreviewSearch(event.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: "0.6rem", marginBottom: "0.45rem", color: "#475569", fontSize: "0.78rem" }}>
          Total with valid phone: <strong>{previewRecipients.length}</strong>
          {previewSearch.trim() && (
            <>
              {" "}
              | Filtered: <strong>{filteredPreviewRecipients.length}</strong>
            </>
          )}
        </div>

        {previewLoading ? (
          <StatusBadge tone="info">Loading recipients...</StatusBadge>
        ) : previewError ? (
          <StatusBadge tone="error">{previewError}</StatusBadge>
        ) : paginatedPreviewRecipients.length === 0 ? (
          <StatusBadge tone="warning">No recipients match this filter.</StatusBadge>
        ) : (
          <>
            <div className="app-table-wrap" style={{ maxHeight: "320px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <table className="app-table" style={{ minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>#</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Company</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPreviewRecipients.map((recipient, index) => (
                    <tr key={recipient.id}>
                      <td>{previewSliceStart + index + 1}</td>
                      <td>{recipient.name}</td>
                      <td>{recipient.phone}</td>
                      <td>{recipient.email}</td>
                      <td>{recipient.companyName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.6rem", gap: "0.55rem", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                Showing {previewSliceStart + 1}-{Math.min(previewSliceEnd, filteredPreviewRecipients.length)} of{" "}
                {filteredPreviewRecipients.length}
              </p>
              <div className="app-inline" style={{ margin: 0 }}>
                <button
                  type="button"
                  className="app-btn-secondary"
                  disabled={safePreviewPage <= 1}
                  onClick={() => setPreviewPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <span style={{ fontSize: "0.76rem", color: "#334155" }}>
                  Page {safePreviewPage} of {totalPreviewPages}
                </span>
                <button
                  type="button"
                  className="app-btn-secondary"
                  disabled={safePreviewPage >= totalPreviewPages}
                  onClick={() => setPreviewPage((page) => Math.min(totalPreviewPages, page + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {sendStatus && (
        <div style={{ marginTop: "0.85rem" }}>
          <StatusBadge tone={sendStatus.tone}>{sendStatus.text}</StatusBadge>
        </div>
      )}

      <div className="app-inline-actions">
        <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/campaigns/new/template")}>
          Back
        </button>
        <button type="button" className="app-btn-primary" onClick={handleSend} disabled={sending}>
          {sending ? "Sending..." : draft.details.scheduleType === "later" ? "Schedule Campaign" : "Send Campaign"}
        </button>
      </div>
    </CampaignWizardLayout>
  );
}

export default CampaignReviewStepPage;
