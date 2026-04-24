import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../services/authService";

const navigationItems = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Campaigns", to: "/app/campaigns", primary: true },
  { label: "Contacts", to: "/app/contacts" },
  { label: "Templates", to: "/app/templates" },
  { label: "Settings", to: "/app/settings/profile" },
];

const routeTitles = {
  "/app/dashboard": "Dashboard",
  "/app/campaigns": "Campaigns",
  "/app/campaigns/new/details": "Campaign Details",
  "/app/campaigns/new/audience": "Campaign Audience",
  "/app/campaigns/new/template": "Campaign Template",
  "/app/campaigns/new/review": "Review & Send",
  "/app/contacts": "Contacts",
  "/app/contacts/import": "Import Contacts",
  "/app/templates": "Templates",
  "/app/conversations": "Conversations",
  "/app/settings/profile": "Profile Settings",
};

function getPageTitle(pathname) {
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }
  if (pathname.startsWith("/app/campaigns/")) {
    return "Campaign Overview";
  }
  if (pathname.startsWith("/app/contacts/imports/")) {
    return "Import Details";
  }
  return "Workspace";
}

function buildBreadcrumbs(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const breadcrumbs = [{ label: "App", to: "/app/dashboard" }];
  let cumulative = "";
  parts.slice(1).forEach((part) => {
    cumulative += `/${part}`;
    const fullPath = `/app${cumulative}`;
    const inferred =
      routeTitles[fullPath] ||
      part
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    breadcrumbs.push({ label: inferred, to: fullPath });
  });
  return breadcrumbs;
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const breadcrumbs = useMemo(() => buildBreadcrumbs(location.pathname), [location.pathname]);

  const closeDrawer = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="app-sidebar-brand">
          <div className="app-sidebar-logo">M</div>
          <div>
            <p className="app-sidebar-title">Meta Workspace</p>
            <p className="app-sidebar-subtitle">Campaign Console</p>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `app-nav-item ${item.primary ? "primary" : ""} ${isActive ? "active" : ""}`.trim()
              }
              onClick={closeDrawer}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <p className="app-sidebar-user">{user?.email || "Signed in user"}</p>
          <button type="button" className="app-sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {isSidebarOpen && <button type="button" className="app-sidebar-overlay" onClick={closeDrawer} />}

      <div className="app-shell-main">
        <header className="app-header">
          <div className="app-header-left">
            <button
              type="button"
              className="app-menu-toggle"
              onClick={() => setIsSidebarOpen((previous) => !previous)}
              aria-label="Toggle navigation"
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <h1 className="app-header-title">{pageTitle}</h1>
              <div className="app-breadcrumbs">
                {breadcrumbs.map((crumb, index) => (
                  <button
                    key={`${crumb.to}-${index}`}
                    type="button"
                    className={`app-crumb ${index === breadcrumbs.length - 1 ? "active" : ""}`}
                    onClick={() => navigate(crumb.to)}
                  >
                    {crumb.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="app-header-actions">
            <button type="button" className="app-cta" onClick={() => navigate("/app/campaigns/new/details")}>
              New Campaign
            </button>
            <button
              type="button"
              className="app-profile-btn"
              onClick={() => navigate("/app/settings/profile")}
              aria-label="Open profile"
            >
              {(user?.displayName || user?.email || "U").trim().slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
