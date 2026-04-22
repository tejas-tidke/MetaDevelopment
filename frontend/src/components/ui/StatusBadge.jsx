import React from "react";

function normalizeTone(value) {
  const normalized = (value || "").toLowerCase();
  if (["success", "sent", "delivered", "read", "active", "processed"].includes(normalized)) {
    return "success";
  }
  if (["warning", "pending", "draft", "partial"].includes(normalized)) {
    return "warning";
  }
  if (["error", "failed", "inactive"].includes(normalized)) {
    return "error";
  }
  return "info";
}

function StatusBadge({ tone, value, children }) {
  const resolvedTone = tone || normalizeTone(value || children);
  const text = children || value || "Unknown";
  return <span className={`app-badge ${resolvedTone}`}>{text}</span>;
}

export default StatusBadge;
