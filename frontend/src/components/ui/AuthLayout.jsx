import React from "react";

function AuthLayout({ children, className = "", shellClassName = "" }) {
  const pageClass = ["auth-page", className].filter(Boolean).join(" ");
  const finalShellClass = ["auth-shell", shellClassName].filter(Boolean).join(" ");

  return (
    <div className={pageClass}>
      <div className={finalShellClass}>{children}</div>
    </div>
  );
}

export default AuthLayout;
