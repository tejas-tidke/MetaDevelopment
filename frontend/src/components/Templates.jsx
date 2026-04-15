import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthProtection } from "../hooks/useAuthProtection";
import api from "../services/api";
import WorkspaceHeader from "./WorkspaceHeader";
import PageLayout from "./ui/PageLayout";
import AppCard from "./ui/AppCard";
import AppButton from "./ui/AppButton";
import AppAlert from "./ui/AppAlert";

function Templates() {
  useAuthProtection();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("ACTIVE");
  const [nameFilter, setNameFilter] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ANY");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/waba/templates");
        if (res.data?.status === "success") {
          setTemplates(Array.isArray(res.data?.data) ? res.data.data : []);
          return;
        }
        setError(res.data?.message || "Unable to fetch templates.");
      } catch (err) {
        console.error("Template fetch error:", err);
        setError("Unable to fetch templates. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const tabTemplates = useMemo(() => {
    const list = Array.isArray(templates) ? templates : [];
    if (tab === "DELETED") {
      return list.filter((item) => normalizeStatus(item.status) === "DELETED");
    }
    return list.filter((item) => normalizeStatus(item.status) !== "DELETED");
  }, [templates, tab]);

  const filteredTemplates = useMemo(() => {
    return tabTemplates.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const createdBy = (item.createdBy || "System").toLowerCase();
      const status = normalizeStatus(item.status);

      const matchesName = !nameFilter.trim() || name.includes(nameFilter.trim().toLowerCase());
      const matchesCreator = !creatorFilter.trim() || createdBy.includes(creatorFilter.trim().toLowerCase());
      const matchesStatus = statusFilter === "ANY" || status === statusFilter;

      return matchesName && matchesCreator && matchesStatus;
    });
  }, [tabTemplates, nameFilter, creatorFilter, statusFilter]);

  const allStatuses = useMemo(() => {
    const set = new Set(tabTemplates.map((item) => normalizeStatus(item.status)).filter(Boolean));
    return Array.from(set);
  }, [tabTemplates]);

  return (
    <PageLayout shellClassName="h-full flex flex-col overflow-hidden">
      <WorkspaceHeader
        title="WhatsApp Templates"
        subtitle="Fetch and manage all your WhatsApp templates in one place."
        backFallback="/welcome"
        actions={
          <AppButton variant="primary" onClick={() => navigate("/templates/new")}>
            <span className="text-base leading-none">+</span>
            New Template
          </AppButton>
        }
      />

      <div className="min-h-0 flex-1 px-4 pb-6 md:px-6">
        {error ? (
          <AppAlert tone="error" title="Template Load Failed" toastKey={`template:error:${error}`}>
            {error}
          </AppAlert>
        ) : null}

        <AppCard className="h-full overflow-hidden flex flex-col">
          <div className="border-b border-[var(--brand-border)] px-5 pt-4 pb-3">
            <div className="flex items-center gap-6 text-sm">
              <button
                type="button"
                onClick={() => setTab("ACTIVE")}
                className={`border-b-2 pb-1 font-semibold transition-colors ${
                  tab === "ACTIVE"
                    ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                    : "border-transparent text-[var(--brand-muted-text)] hover:text-[var(--brand-text)]"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setTab("DELETED")}
                className={`border-b-2 pb-1 font-semibold transition-colors ${
                  tab === "DELETED"
                    ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                    : "border-transparent text-[var(--brand-muted-text)] hover:text-[var(--brand-text)]"
                }`}
              >
                Deleted
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft-bg)] px-3">
                <TemplateIcon className="h-4 w-4 text-[var(--brand-muted-text)]" />
                <input
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Template"
                  className="w-36 border-0 bg-transparent p-0 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-muted-text)] focus:outline-none"
                />
              </div>

              <div className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft-bg)] px-3">
                <UserIcon className="h-4 w-4 text-[var(--brand-muted-text)]" />
                <input
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                  placeholder="Name"
                  className="w-28 border-0 bg-transparent p-0 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-muted-text)] focus:outline-none"
                />
              </div>

              <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-soft-bg)] px-3 text-sm text-[var(--brand-text)]">
                <StatusIcon className="h-4 w-4 text-[var(--brand-muted-text)]" />
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border-0 bg-transparent text-sm text-[var(--brand-text)] focus:outline-none"
                >
                  <option value="ANY">Any</option>
                  {allStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-4 text-lg font-medium text-[var(--brand-secondary)]">
              {filteredTemplates.length} of {tabTemplates.length} Total Templates
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--brand-muted-text)]">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex h-full items-center justify-center p-10 text-sm text-[var(--brand-muted-text)]">
                No templates found for the selected filters.
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="sticky top-0 bg-[var(--brand-card-bg)]">
                  <tr className="border-b border-[var(--brand-border)] text-left text-sm font-semibold text-[var(--brand-secondary)]">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Created By</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Preview</th>
                    <th className="px-5 py-3">Languages</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((item) => {
                    const status = normalizeStatus(item.status);
                    const languageLabel = formatLanguage(item.language);
                    return (
                      <tr
                        key={`${item.name}-${item.language}-${status}`}
                        className="border-b border-[var(--brand-border)] text-sm text-[var(--brand-text)] hover:bg-[var(--brand-soft-bg)]/40"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.name || "-"}</span>
                            {status ? (
                              <span
                                className={`inline-flex h-2 w-2 rounded-full ${
                                  status === "APPROVED"
                                    ? "bg-[var(--brand-success)]"
                                    : status === "REJECTED"
                                      ? "bg-[var(--brand-error)]"
                                      : "bg-[var(--brand-warning)]"
                                }`}
                                title={status}
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[var(--brand-muted-text)]">{item.createdBy || "System"}</td>
                        <td className="px-5 py-3 text-[var(--brand-muted-text)]">{item.category || "-"}</td>
                        <td className="max-w-[360px] px-5 py-3 text-[var(--brand-muted-text)]">
                          <span className="block max-w-[360px] truncate">{getPreviewText(item.body)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2 rounded-md bg-[var(--brand-soft-bg)] px-3 py-1.5 text-sm font-medium text-[var(--brand-secondary)]">
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-success)]" />
                            {languageLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </AppCard>
      </div>
    </PageLayout>
  );
}

function normalizeStatus(status) {
  return (status || "").toString().trim().toUpperCase();
}

function formatLanguage(language) {
  if (!language) return "Unknown";
  const value = language.toString();
  if (value === "en" || value === "en_US") return "English";
  if (value.includes("_")) return value.split("_")[0];
  return value;
}

function getPreviewText(body) {
  const text = (body || "").replace(/\s+/g, " ").trim();
  if (!text) return "-";
  if (text.length <= 70) return text;
  return `${text.slice(0, 67)}...`;
}

function TemplateIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 13h6" />
    </svg>
  );
}

function UserIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StatusIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 17 5-5 4 4 7-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16" />
    </svg>
  );
}

export default Templates;
