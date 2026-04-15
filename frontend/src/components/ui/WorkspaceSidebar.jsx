import React from "react";
import { Link, useLocation } from "react-router-dom";

const DEFAULT_NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/welcome",
    icon: HomeIcon,
    activePaths: ["/welcome"],
  },
  {
    key: "templates",
    label: "Templates",
    to: "/templates",
    icon: CalendarIcon,
    activePaths: ["/templates", "/flows"],
    badge: "New",
  },
  {
    key: "conversations",
    label: "Conversations",
    to: "/conversations",
    icon: ChatIcon,
    activePaths: ["/conversations"],
  },
  {
    key: "existing",
    label: "Existing Data",
    to: "/existing-list",
    icon: StackIcon,
    activePaths: ["/existing-list"],
  },
  {
    key: "upload",
    label: "Upload File",
    to: "/file-upload",
    icon: UploadIcon,
    activePaths: ["/file-upload"],
  },
  {
    key: "uploaded",
    label: "Uploaded Data",
    to: "/uploaded-data-select",
    icon: BookIcon,
    activePaths: ["/uploaded-data", "/uploaded-data-select"],
  },
  {
    key: "profile",
    label: "Profile",
    to: "/profile",
    icon: UserIcon,
    activePaths: ["/profile"],
  },
];

const LIST_ITEM_STYLES =
  "select-none text-[var(--brand-muted-text)] hover:bg-[var(--brand-soft-bg)] hover:text-[var(--brand-text)] focus:bg-[var(--brand-soft-bg)] focus:text-[var(--brand-text)] active:bg-[var(--brand-soft-bg)] active:text-[var(--brand-text)]";

function WorkspaceSidebar({
  isMobileOpen = false,
  onCloseMobile,
  isMinified = false,
  onToggleMinified,
  brand = "Meta Workspace",
  items = DEFAULT_NAV_ITEMS,
}) {
  const location = useLocation();

  const isItemActive = (item) => {
    const currentPath = location.pathname;
    const pathsToMatch = item.activePaths?.length ? item.activePaths : [item.to];
    return pathsToMatch.some((path) => currentPath === path || currentPath.startsWith(`${path}/`));
  };

  const renderLink = (item, compact = false) => {
    const Icon = item.icon;
    const active = isItemActive(item);

    return (
      <li key={item.key}>
        <Link
          to={item.to}
          aria-current={active ? "page" : undefined}
          onClick={onCloseMobile}
          className={[
            "flex items-center gap-3 rounded-lg px-3 py-[9px] text-sm transition-colors",
            active ? "bg-[var(--brand-soft-bg)] text-[var(--brand-secondary)]" : LIST_ITEM_STYLES,
            compact ? "justify-center px-2.5" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!compact ? <span className="truncate">{item.label}</span> : null}
          {!compact && item.badge ? (
            <span className="ml-auto inline-flex items-center rounded-full bg-[var(--brand-soft-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-primary)]">
              {item.badge}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  const widthClass = isMinified ? "lg:w-[4.5rem]" : "lg:w-[18rem]";

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity lg:hidden ${
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-label="Close sidebar"
        onClick={onCloseMobile}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 w-[18rem] border-r border-[var(--brand-border)] bg-[var(--brand-card-bg)] transition-transform duration-300",
          "lg:translate-x-0",
          widthClass,
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="Application sidebar"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-[var(--brand-border)] px-4">
            <div className="min-w-0">
              <p className={`truncate text-base font-semibold text-[var(--brand-secondary)] ${isMinified ? "hidden lg:block lg:text-xs" : ""}`}>
                {isMinified ? "MW" : brand}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--brand-muted-text)] hover:bg-[var(--brand-soft-bg)] lg:hidden"
                aria-label="Close navigation"
                onClick={onCloseMobile}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hidden h-8 w-8 items-center justify-center rounded-md text-[var(--brand-muted-text)] hover:bg-[var(--brand-soft-bg)] lg:inline-flex"
                aria-label={isMinified ? "Expand sidebar" : "Collapse sidebar"}
                onClick={onToggleMinified}
              >
                {isMinified ? <ExpandIcon className="h-4 w-4" /> : <CollapseIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
            <ul className="space-y-1">{items.map((item) => renderLink(item, isMinified))}</ul>
          </nav>
        </div>
      </aside>
    </>
  );
}

function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function ChatIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5h-6L3 22v-6.5A8.5 8.5 0 1 1 21 11.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5" />
    </svg>
  );
}

function StackIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 2 9 4.5-9 4.5L3 6.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 11.5 9 4.5 9-4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 16.5 9 4.5 9-4.5" />
    </svg>
  );
}

function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 9 5-5 5 5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 16.5v2.5A2 2 0 0 1 18 21H6a2 2 0 0 1-2-2v-2.5" />
    </svg>
  );
}

function BookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 4.5A2.5 2.5 0 0 1 4.5 2H20v18H4.5A2.5 2.5 0 0 0 2 22z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 4.5v13A2.5 2.5 0 0 1 4.5 15H20" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CollapseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M15 3v18" />
      <path d="m10 15-3-3 3-3" />
    </svg>
  );
}

function ExpandIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M15 3v18" />
      <path d="m8 9 3 3-3 3" />
    </svg>
  );
}

export default WorkspaceSidebar;
