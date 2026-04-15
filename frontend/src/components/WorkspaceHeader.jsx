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
    <header className="sticky top-0 z-20 border-b border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-4 py-4 backdrop-blur md:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {showBack && (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 text-xs font-semibold text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-soft-bg)]"
                onClick={handleBack}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
            {showHome && (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft-bg)] px-3 text-xs font-semibold text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-soft-bg)]/80"
                onClick={goHome}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <h1 className="text-xl font-semibold leading-tight text-[var(--brand-text)]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm leading-relaxed text-[var(--brand-muted-text)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export default WorkspaceHeader;
