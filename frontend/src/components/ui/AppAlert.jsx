import React from "react";
import ToastAlert from "./ToastAlert";

function AppAlert({ tone = "info", className = "", title, toastKey, onClose, children, ...props }) {
  const allowedTones = new Set(["success", "error", "warn", "info"]);
  const finalTone = allowedTones.has(tone) ? tone : "info";
  const resolvedTitle =
    title ||
    (finalTone === "success"
      ? "Success"
      : finalTone === "error"
        ? "Error"
        : finalTone === "warn"
          ? "Warning"
          : "Info");

  return (
    <ToastAlert
      tone={finalTone}
      title={resolvedTitle}
      className={className}
      toastKey={toastKey}
      onClose={onClose}
      {...props}
    >
      {children}
    </ToastAlert>
  );
}

export default AppAlert;
