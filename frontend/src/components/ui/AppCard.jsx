import React from "react";

function AppCard({ children, soft = false, className = "", ...props }) {
  const baseClass = soft ? "workspace-card-soft" : "workspace-card";
  return (
    <div className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export default AppCard;
