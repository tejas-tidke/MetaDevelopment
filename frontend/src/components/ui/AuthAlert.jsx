import React from "react";

function AuthAlert({ tone = "error", className = "", children, ...props }) {
  const allowedTones = new Set(["success", "error"]);
  const finalTone = allowedTones.has(tone) ? tone : "error";

  return (
    <div className={`auth-alert ${finalTone} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default AuthAlert;
