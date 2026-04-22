import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await api.get("/waba/templates");
        if (response?.data?.status !== "success") {
          throw new Error(response?.data?.message || "Failed to fetch templates");
        }
        setTemplates(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (fetchError) {
        console.error("Templates fetch failed", fetchError);
        setError(fetchError?.message || "Could not load templates.");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((template) => {
      return [template?.name, template?.category, template?.language, template?.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [search, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.name === selectedTemplateName) || null,
    [selectedTemplateName, templates]
  );

  return (
    <div className="app-page">
      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Templates</h2>
            <p>Manage and inspect approved messaging templates.</p>
          </div>
        </div>
        <div className="app-section-body">
          <div className="app-field" style={{ maxWidth: "360px", marginBottom: "0.9rem" }}>
            <label htmlFor="template-search">Search templates</label>
            <input
              id="template-search"
              className="app-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name/category/language"
            />
          </div>

          {loading ? (
            <StatusBadge tone="info">Loading templates...</StatusBadge>
          ) : error ? (
            <StatusBadge tone="error">{error}</StatusBadge>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState>No templates found.</EmptyState>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Language</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template.id || template.name}
                      onClick={() => setSelectedTemplateName(template.name)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{template.name}</td>
                      <td>
                        <StatusBadge value={template.status || "unknown"} />
                      </td>
                      <td>{template.category || "-"}</td>
                      <td>{template.language || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Template Preview</h2>
            <p>Inspect template body and placeholder requirements.</p>
          </div>
        </div>
        <div className="app-section-body">
          {!selectedTemplate ? (
            <EmptyState>Select a template row to preview details.</EmptyState>
          ) : (
            <div className="app-field-grid">
              <div className="app-field">
                <label>Name</label>
                <input className="app-input" readOnly value={selectedTemplate.name || "-"} />
              </div>
              <div className="app-field">
                <label>Status</label>
                <div className="app-inline" style={{ marginTop: "0.45rem" }}>
                  <StatusBadge value={selectedTemplate.status || "unknown"} />
                </div>
              </div>
              <div className="app-field" style={{ gridColumn: "1 / -1" }}>
                <label>Body</label>
                <div className="app-empty" style={{ textAlign: "left" }}>
                  {selectedTemplate.body || "No body preview returned from API."}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default TemplatesPage;

