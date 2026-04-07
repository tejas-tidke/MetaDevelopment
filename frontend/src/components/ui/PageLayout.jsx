import React from "react";

function PageLayout({ children, className = "", shellClassName = "" }) {
  const pageClass = ["workspace-page", className].filter(Boolean).join(" ");
  const finalShellClass = ["workspace-shell", shellClassName].filter(Boolean).join(" ");

  return (
    <div className={pageClass}>
      <div className={finalShellClass}>{children}</div>
    </div>
  );
}

export default PageLayout;
