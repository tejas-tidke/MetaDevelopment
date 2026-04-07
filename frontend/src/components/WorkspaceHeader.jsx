import React from "react";
import { useNavigate } from "react-router-dom";

function WorkspaceHeader({
  title,
  subtitle,
  actions,
  showBack = true,
  showHome = true,
  backFallback = "/welcome",
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(backFallback, { replace: true });
  };

  const goHome = () => {
    navigate("/welcome");
  };

  return (
    <header className="workspace-header">
      <div className="workspace-header-main">
        <div className="workspace-nav">
          {showBack && (
            <button type="button" className="workspace-nav-btn" onClick={handleBack}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          )}
          {showHome && (
            <button type="button" className="workspace-nav-btn home" onClick={goHome}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10.25L12 3l9 7.25V21a1 1 0 01-1 1h-5.25a.75.75 0 01-.75-.75V15.5a2 2 0 00-2-2h0a2 2 0 00-2 2v5.75a.75.75 0 01-.75.75H4a1 1 0 01-1-1v-10.75z"
                />
              </svg>
              Home
            </button>
          )}
        </div>
        <h1 className="workspace-title">{title}</h1>
        {subtitle ? <p className="workspace-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="workspace-header-actions">{actions}</div> : null}
    </header>
  );
}

export default WorkspaceHeader;
