import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import WorkspaceSidebar from "./WorkspaceSidebar";

function PageLayout({
  children,
  className = "",
  shellClassName = "",
  showSidebar = true,
  sidebarBrand = "Meta Workspace",
  sidebarItems,
}) {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarMinified, setIsSidebarMinified] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("workspace.sidebar.minified") === "1";
  });

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("workspace.sidebar.minified", isSidebarMinified ? "1" : "0");
  }, [isSidebarMinified]);

  const pageClass = ["workspace-page", className].filter(Boolean).join(" ");
  const shouldUseShellScroll = !shellClassName.includes("overflow-hidden");
  const finalShellClass = ["workspace-shell", "h-full flex flex-col", shouldUseShellScroll ? "overflow-y-auto" : "", shellClassName]
    .filter(Boolean)
    .join(" ");
  const contentOffsetClass = showSidebar
    ? isSidebarMinified
      ? "lg:pl-[4.5rem]"
      : "lg:pl-[18rem]"
    : "";

  return (
    <div className={pageClass}>
      {showSidebar ? (
        <WorkspaceSidebar
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isMinified={isSidebarMinified}
          onToggleMinified={() => setIsSidebarMinified((prev) => !prev)}
          brand={sidebarBrand}
          items={sidebarItems}
        />
      ) : null}

      <div className={`relative z-[1] h-screen min-w-0 ${contentOffsetClass}`}>
        {showSidebar ? (
          <button
            type="button"
            className="fixed left-3 top-3 z-[45] inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] text-[var(--brand-secondary)] shadow-sm lg:hidden"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        ) : null}

        <div className={finalShellClass}>{children}</div>
      </div>
    </div>
  );
}

export default PageLayout;
