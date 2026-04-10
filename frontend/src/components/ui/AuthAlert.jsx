import React from "react";
import ToastAlert from "./ToastAlert";

function AuthAlert({ tone = "error", className = "", title, toastKey, onClose, children, ...props }) {
  const allowedTones = new Set(["success", "error"]);
  const finalTone = allowedTones.has(tone) ? tone : "error";
  const resolvedTitle = title || (finalTone === "success" ? "Success" : "Error");

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

export default AuthAlert;
