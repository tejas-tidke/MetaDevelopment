import React from "react";

function AppAlert({ tone = "info", className = "", children, ...props }) {
  const allowedTones = new Set(["success", "error", "warn", "info"]);
  const finalTone = allowedTones.has(tone) ? tone : "info";

  return (
    <div className={`workspace-message ${finalTone} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default AppAlert;
