import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

function extractBodyText(template) {
  if (template?.body) {
    return template.body;
  }
  if (template?.preview?.body) {
    return template.preview.body;
  }
  const bodyComponent = Array.isArray(template?.components)
    ? template.components.find((component) => component?.type === "BODY")
    : null;
  return bodyComponent?.text || "";
}

function countPlaceholders(text) {
  if (!text) return 0;
  const matches = text.match(/\{\{\s*[^{}]+\s*}}/g);
  return matches ? matches.length : 0;
}

function resolveUrlTemplate(urlTemplate, values = []) {
  if (!urlTemplate) return "";
  let valueCursor = 0;
  return urlTemplate.replace(/\{\{\d+}}/g, () => {
    const replacement = (values[valueCursor] || "").trim();
    valueCursor += 1;
    return replacement || "{{value}}";
  });
}

function getTemplateButtons(template) {
  const rawButtons = Array.isArray(template?.buttons)
    ? template.buttons
    : Array.isArray(template?.preview?.buttons)
      ? template.preview.buttons
      : [];
  return rawButtons.map((button, index) => {
    const normalizedType = (button?.type || "").toUpperCase();
    const resolvedIndex = Number.isFinite(Number(button?.index)) ? Number(button.index) : index;
    const url = button?.url || "";
    const paramCount = Number(button?.paramCount || (normalizedType === "URL" ? countPlaceholders(url) : 0) || 0);
    return {
      index: resolvedIndex,
      type: normalizedType,
      text: button?.text || "",
      url,
      phoneNumber: button?.phoneNumber || "",
      flowId: button?.flowId || "",
      flowName: button?.flowName || "",
      flowAction: button?.flowAction || "",
      navigateScreen: button?.navigateScreen || "",
      paramCount,
    };
  });
}

function toTemplateKey(template) {
  return `${template?.name || ""}::${template?.language || ""}::${template?.category || ""}::${template?.status || ""}`;
}

function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await api.get("/waba/templates");
        if (response?.data?.status !== "success") {
          throw new Error(response?.data?.message || "Failed to fetch templates");
        }
        const nextTemplates = Array.isArray(response.data.data) ? response.data.data : [];
        setTemplates(nextTemplates);
        if (nextTemplates.length > 0) {
          setSelectedTemplateKey((current) => current || toTemplateKey(nextTemplates[0]));
        }
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
    () => templates.find((template) => toTemplateKey(template) === selectedTemplateKey) || null,
    [selectedTemplateKey, templates]
  );
  const headerFormat = (selectedTemplate?.headerFormat || selectedTemplate?.preview?.header?.format || "").toUpperCase();
  const previewHeaderText = useMemo(() => {
    if (!selectedTemplate) return "";
    if (headerFormat === "TEXT") {
      const headerText = (selectedTemplate?.headerText || selectedTemplate?.preview?.header?.text || "").trim();
      if (headerText) return headerText;
      const headerParamCount = Number(selectedTemplate?.headerParamCount || countPlaceholders(headerText) || 0);
      return headerParamCount > 0 ? "{{header}}" : "";
    }
    if (headerFormat === "IMAGE") return "";
    if (headerFormat) return `${headerFormat} HEADER`;
    return "";
  }, [headerFormat, selectedTemplate]);
  const previewBodyText = useMemo(() => {
    const bodyText = extractBodyText(selectedTemplate);
    if (!bodyText) return "(No body)";
    return bodyText;
  }, [selectedTemplate]);
  const templateButtons = useMemo(() => getTemplateButtons(selectedTemplate), [selectedTemplate]);
  const previewButtons = useMemo(
    () =>
      templateButtons.map((button) => {
        const placeholderValues = Array.from({ length: button.paramCount || 0 }, (_, index) => `{{${index + 1}}}`);
        return {
          ...button,
          resolvedUrl: button.url ? resolveUrlTemplate(button.url, placeholderValues) : "",
        };
      }),
    [templateButtons]
  );
  const flowButtons = useMemo(
    () => templateButtons.filter((button) => button.type === "FLOW"),
    [templateButtons]
  );
  const previewTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
    []
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
                  {filteredTemplates.map((template, index) => {
                    const rowKey = toTemplateKey(template);
                    const isSelected = rowKey === selectedTemplateKey;
                    return (
                      <tr
                        key={`${rowKey}-${index}`}
                        onClick={() => setSelectedTemplateKey(rowKey)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "rgba(59, 130, 246, 0.08)" : "transparent",
                        }}
                      >
                        <td>{template.name}</td>
                        <td>
                          <StatusBadge value={template.status || "unknown"} />
                        </td>
                        <td>{template.category || "-"}</td>
                        <td>{template.language || "-"}</td>
                      </tr>
                    );
                  })}
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
            <p>WhatsApp-style preview matching campaign creation flow.</p>
          </div>
        </div>
        <div className="app-section-body">
          {!selectedTemplate ? (
            <EmptyState>Select a template row to preview details.</EmptyState>
          ) : (
            <>
              <div className="app-field-grid" style={{ marginBottom: "0.9rem" }}>
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
                <div className="app-field">
                  <label>Category</label>
                  <input className="app-input" readOnly value={selectedTemplate.category || "-"} />
                </div>
                <div className="app-field">
                  <label>Language</label>
                  <input className="app-input" readOnly value={selectedTemplate.language || "-"} />
                </div>
              </div>

              <div className="wa-preview-shell">
                <div className="wa-preview-label">Your template</div>
                <div className="wa-device">
                  <div className="wa-bubble">
                    {headerFormat === "IMAGE" && (
                      <div className="wa-image-wrap">
                        <div className="wa-image-placeholder">
                          Image header found in this template. Live image preview appears when media is attached in campaign
                          creation.
                        </div>
                      </div>
                    )}
                    {previewHeaderText ? <div className="wa-header">{previewHeaderText}</div> : null}
                    <div className="wa-body">{previewBodyText}</div>
                    <div className="wa-footer-row">
                      <span className="wa-footer">{selectedTemplate.footer || selectedTemplate?.preview?.footer || ""}</span>
                      <span className="wa-meta">
                        <span className="wa-time">{previewTime}</span>
                        <span className="wa-check">&#10003;&#10003;</span>
                      </span>
                    </div>
                    {previewButtons.length > 0 && (
                      <div className="wa-buttons">
                        {previewButtons.map((button) => (
                          <button key={`preview-btn-${button.index}`} type="button" className="wa-button" disabled>
                            <span className="wa-flow-icon" aria-hidden="true">
                              {button.type === "FLOW" ? "F" : button.type === "URL" ? "U" : button.type === "PHONE_NUMBER" ? "P" : "B"}
                            </span>
                            <span className="wa-button-text">{button.text || `Button ${button.index + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {flowButtons.length > 0 && (
                <div className="wa-flow-meta">
                  <p className="wa-flow-title">Flow Buttons</p>
                  {flowButtons.map((button) => (
                    <div key={`flow-meta-${button.index}`} className="wa-flow-item">
                      <span>{button.text || `Button ${button.index + 1}`}</span>
                      <span>{button.flowName || button.flowId || "Flow not linked"}</span>
                      <span>
                        {button.flowAction || "No action"}
                        {button.navigateScreen ? ` | ${button.navigateScreen}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {previewButtons.some((button) => button.url) && (
                <div className="wa-flow-meta">
                  <p className="wa-flow-title">Button URLs</p>
                  {previewButtons
                    .filter((button) => button.url)
                    .map((button) => (
                      <div key={`preview-url-${button.index}`} className="wa-flow-item">
                        <span>{button.text || `Button ${button.index + 1}`}</span>
                        <span>{button.resolvedUrl || button.url}</span>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default TemplatesPage;

