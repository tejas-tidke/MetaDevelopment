import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import api from "../../services/api";
import { getCampaignById } from "../../services/campaignService";

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

function normalizeStatus(value) {
  const normalized = (value || "").toString().trim().toLowerCase();
  if (!normalized) return "unknown";
  if (["failed", "error"].includes(normalized)) return "failed";
  if (["read", "delivered", "sent"].includes(normalized)) return normalized;
  if (["partial"].includes(normalized)) return "sent";
  return "unknown";
}

function formatDateTime(value) {
  if (!value) return "-";
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return String(value);
  return asDate.toLocaleString();
}

function CampaignDetailPage() {
  const navigate = useNavigate();
  const { campaignId } = useParams();

  const campaign = useMemo(() => getCampaignById(campaignId), [campaignId]);
  const [recipientRows, setRecipientRows] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    if (!campaign) {
      setRecipientRows([]);
      return;
    }
    const initialRows = Array.isArray(campaign.recipientStatuses) ? campaign.recipientStatuses : [];
    setRecipientRows(initialRows);
  }, [campaign]);

  const refreshRecipientStatuses = useCallback(
    async (rowsSource) => {
      const rows = Array.isArray(rowsSource) ? rowsSource : [];
      if (!rows.length) {
        return;
      }

      const messageIds = rows
        .map((row) => (row?.waMessageId || "").toString().trim())
        .filter((value) => value.length > 0);
      const recipients = rows
        .map((row) => normalizePhone(row?.normalizedTo || row?.to))
        .filter((value) => value.length > 0);

      if (messageIds.length === 0 && recipients.length === 0) {
        return;
      }

      try {
        setStatusLoading(true);
        setStatusError("");
        const response = await api.post("/waba/message-statuses", {
          messageIds,
          recipients,
          limit: Math.max(2000, rows.length * 10),
        });

        const byMessageId = response?.data?.byMessageId || {};
        const byRecipient = response?.data?.byRecipient || {};

        const mergedRows = rows.map((row) => {
          const normalizedTo = normalizePhone(row?.normalizedTo || row?.to);
          const messageId = (row?.waMessageId || "").toString().trim();
          const liveByMessage = messageId ? byMessageId[messageId] : null;
          const liveByRecipient = normalizedTo ? byRecipient[normalizedTo] : null;
          const live = liveByMessage || liveByRecipient || null;

          const fallbackStatus = normalizeStatus(row?.status);
          const liveStatus = normalizeStatus(live?.status);
          const resolvedStatus = liveStatus !== "unknown" ? liveStatus : fallbackStatus;

          return {
            ...row,
            normalizedTo,
            waMessageId: messageId || live?.waMessageId || "",
            status: resolvedStatus,
            error: live?.errorMessage || row?.error || "",
            updatedAt: live?.createdAt || row?.updatedAt || campaign?.updatedAt || campaign?.createdAt,
          };
        });

        setRecipientRows(mergedRows);
      } catch (error) {
        console.error("Failed to refresh recipient statuses", error);
        setStatusError(error?.response?.data?.message || "Unable to refresh recipient status from webhook logs.");
      } finally {
        setStatusLoading(false);
      }
    },
    [campaign?.createdAt, campaign?.updatedAt]
  );

  useEffect(() => {
    if (!campaign) return;
    if (!Array.isArray(campaign.recipientStatuses) || campaign.recipientStatuses.length === 0) return;

    refreshRecipientStatuses(campaign.recipientStatuses);
    const intervalId = setInterval(() => {
      refreshRecipientStatuses(campaign.recipientStatuses);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [campaign, refreshRecipientStatuses]);

  if (!campaign) {
    return (
      <div className="app-page">
        <section className="app-section-card">
          <div className="app-section-body">
            <EmptyState>This campaign no longer exists.</EmptyState>
            <div className="app-inline-actions">
              <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/campaigns")}>
                Back to Campaigns
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const rows = [
    ["Campaign Name", campaign.name],
    ["Status", campaign.status],
    ["Objective", campaign.objective],
    ["Template", campaign.templateName],
    ["Language", campaign.language],
    ["Audience Mode", AUDIENCE_MODE_LABEL[campaign.audienceMode] || campaign.audienceMode || "-"],
    ["Recipient Count", campaign.recipientCount],
    ["Schedule Type", campaign.scheduleType],
    ["Scheduled At", campaign.scheduledAt || "-"],
    ["Last Updated", formatDateTime(campaign.updatedAt || campaign.createdAt)],
  ];

  const statusSummary = recipientRows.reduce(
    (summary, row) => {
      const status = normalizeStatus(row?.status);
      summary.total += 1;
      if (status in summary) {
        summary[status] += 1;
      } else {
        summary.unknown += 1;
      }
      return summary;
    },
    { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, unknown: 0 }
  );

  return (
    <div className="app-page">
      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>{campaign.name}</h2>
            <p>Campaign detail and delivery metadata</p>
          </div>
          <StatusBadge value={campaign.status} />
        </div>
        <div className="app-section-body">
          <div className="app-table-wrap">
            <table className="app-table" style={{ minWidth: "100%" }}>
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <th style={{ width: "220px" }}>{label}</th>
                    <td>{String(value ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="app-inline-actions">
            <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/campaigns")}>
              Back
            </button>
            <button
              type="button"
              className="app-btn-primary"
              onClick={() => navigate("/app/campaigns/new/details")}
            >
              Duplicate as New
            </button>
          </div>
        </div>
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Recipient Delivery Status</h2>
            <p>Live status from send response + WhatsApp webhook updates.</p>
          </div>
          <button
            type="button"
            className="app-btn-secondary"
            onClick={() => refreshRecipientStatuses(recipientRows)}
            disabled={statusLoading || recipientRows.length === 0}
          >
            {statusLoading ? "Refreshing..." : "Refresh Status"}
          </button>
        </div>
        <div className="app-section-body">
          {recipientRows.length === 0 ? (
            <EmptyState>
              Recipient-level tracking is not available for this campaign. Send from the new campaign flow to enable
              sent/delivered/read/failed tracking.
            </EmptyState>
          ) : (
            <>
              <div className="app-grid-4" style={{ marginBottom: "0.75rem" }}>
                <article className="app-stat">
                  <p className="app-stat-label">Total</p>
                  <p className="app-stat-value">{statusSummary.total}</p>
                </article>
                <article className="app-stat">
                  <p className="app-stat-label">Sent</p>
                  <p className="app-stat-value">{statusSummary.sent}</p>
                </article>
                <article className="app-stat">
                  <p className="app-stat-label">Delivered</p>
                  <p className="app-stat-value">{statusSummary.delivered}</p>
                </article>
                <article className="app-stat">
                  <p className="app-stat-label">Read / Failed</p>
                  <p className="app-stat-value">
                    {statusSummary.read} / {statusSummary.failed}
                  </p>
                </article>
              </div>

              <div className="app-table-wrap">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Recipient</th>
                      <th>Message ID</th>
                      <th>Status</th>
                      <th>Last Update</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientRows.map((row, index) => (
                      <tr key={row?.id || `${row?.to || "recipient"}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{row?.to || row?.normalizedTo || "-"}</td>
                        <td style={{ maxWidth: "240px", wordBreak: "break-all" }}>{row?.waMessageId || "-"}</td>
                        <td>
                          <StatusBadge value={normalizeStatus(row?.status)} />
                        </td>
                        <td>{formatDateTime(row?.updatedAt)}</td>
                        <td style={{ color: row?.error ? "#b91c1c" : "#64748b" }}>{row?.error || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {statusError && (
            <p style={{ margin: "0.65rem 0 0", color: "#b91c1c", fontSize: "0.8rem" }}>{statusError}</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default CampaignDetailPage;
