import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useCampaignDraft } from "../../context/CampaignDraftContext";
import CampaignWizardLayout from "./CampaignWizardLayout";
import { generateCampaignId, upsertCampaign } from "../../services/campaignService";
import StatusBadge from "../../components/ui/StatusBadge";

function toPhoneList(records) {
  return (records || [])
    .map((item) => (item?.phoneNo || item?.phone || "").toString().trim())
    .filter((value) => value.length > 0);
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
    if (!key || backendByPhone.has(key)) return;
    backendByPhone.set(key, item);
  });

  const errorsByPhone = new Map();
  errors.forEach((item) => {
    const key = normalizePhone(item?.to || "");
    if (!key || errorsByPhone.has(key)) return;
    errorsByPhone.set(key, item?.error || "Failed to send message.");
  });

  return uniqueRecipients.map((recipient, index) => {
    const normalizedTo = normalizePhone(recipient);
    const backendResult = backendByPhone.get(normalizedTo);
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

  const finalizeCampaignRecord = ({ status, recipientCount, backendResponse, recipientStatuses, recipients }) => {
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
    resetDraft();
    navigate(`/app/campaigns/${campaign.id}`);
  };

  const handleSend = async () => {
    if (!draft.template.templateName) {
      setSendStatus({ tone: "error", text: "Template selection is required." });
      return;
    }

    if (draft.details.scheduleType === "later") {
      finalizeCampaignRecord({
        status: "scheduled",
        recipientCount: draft.audience.estimatedRecipients || 0,
        recipientStatuses: [],
        recipients: [],
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

      setSendStatus({
        tone: status === "sent" ? "success" : status === "partial" ? "warning" : "error",
        text:
          status === "sent"
            ? `Campaign sent to ${sentCount} recipients.`
            : response?.data?.message || "Campaign response received with warnings.",
      });

      finalizeCampaignRecord({
        status,
        recipientCount: sentCount,
        backendResponse: response?.data || null,
        recipientStatuses,
        recipients,
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
