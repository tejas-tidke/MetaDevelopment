import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useCampaignDraft } from "../../context/CampaignDraftContext";
import CampaignWizardLayout from "./CampaignWizardLayout";
import StatusBadge from "../../components/ui/StatusBadge";

function extractBodyText(template) {
  if (template?.body) {
    return template.body;
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

function generateFlowToken() {
  return `flow_${Date.now().toString().slice(-10)}`;
}

function toButtonInputKey(button) {
  return String(button?.index ?? "");
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
  if (!template || !Array.isArray(template.buttons)) return [];
  return template.buttons.map((button, index) => {
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
      parameterType: button?.parameterType || "text",
      paramCount,
    };
  });
}

function isValidMediaFile(file, headerFormat) {
  if (!file) {
    return { valid: false, message: "No file selected." };
  }
  const format = (headerFormat || "").toUpperCase();

  if (format === "IMAGE") {
    if (!file.type.startsWith("image/")) {
      return { valid: false, message: "Please upload an image file for IMAGE header templates." };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, message: "Image size should be less than 5MB." };
    }
    return { valid: true, message: "" };
  }

  if (format === "VIDEO") {
    if (!file.type.startsWith("video/")) {
      return { valid: false, message: "Please upload a video file for VIDEO header templates." };
    }
    if (file.size > 16 * 1024 * 1024) {
      return { valid: false, message: "Video size should be less than 16MB." };
    }
    return { valid: true, message: "" };
  }

  if (format === "DOCUMENT") {
    if (file.size > 100 * 1024 * 1024) {
      return { valid: false, message: "Document size should be less than 100MB." };
    }
    return { valid: true, message: "" };
  }

  return { valid: true, message: "" };
}

function CampaignTemplateStepPage() {
  const navigate = useNavigate();
  const { draft, updateDraftSection } = useCampaignDraft();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const previousTemplateNameRef = useRef("");
  const templateDraft = draft.template || {};

  useEffect(() => {
    if (!draft.details.campaignName.trim()) {
      navigate("/app/campaigns/new/details", { replace: true });
      return;
    }
    if (!draft.audience.mode) {
      navigate("/app/campaigns/new/audience", { replace: true });
    }
  }, [draft.audience.mode, draft.details.campaignName, navigate]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await api.get("/waba/templates");
        if (response.data?.status === "success") {
          setTemplates(Array.isArray(response.data.data) ? response.data.data : []);
        } else {
          throw new Error(response.data?.message || "Failed to fetch templates");
        }
      } catch (fetchError) {
        console.error("Template fetch failed", fetchError);
        setError("Could not load templates.");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.name === templateDraft.templateName) || null,
    [templateDraft.templateName, templates]
  );

  const headerFormat = (selectedTemplate?.headerFormat || "").toUpperCase();
  const bodyParamCount = useMemo(() => {
    if (!selectedTemplate) return 0;
    const declared = Number(selectedTemplate.bodyParamCount || 0);
    if (declared > 0) return declared;
    return countPlaceholders(extractBodyText(selectedTemplate));
  }, [selectedTemplate]);
  const headerParamCount = Number(selectedTemplate?.headerParamCount || 0);
  const templateButtons = useMemo(() => getTemplateButtons(selectedTemplate), [selectedTemplate]);
  const dynamicButtons = useMemo(
    () => templateButtons.filter((button) => (button.paramCount || 0) > 0),
    [templateButtons]
  );
  const flowButtons = useMemo(
    () => templateButtons.filter((button) => button.type === "FLOW"),
    [templateButtons]
  );
  const hasDynamicTextHeader = headerFormat === "TEXT" && headerParamCount > 0;
  const hasMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);
  const requiresHeaderInput = hasDynamicTextHeader || hasMediaHeader;
  const personalizeWithUserData = templateDraft.personalizeWithUserData !== false;

  useEffect(() => {
    const mediaFile = templateDraft.headerMediaFile;
    if (!(mediaFile instanceof File)) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(mediaFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [templateDraft.headerMediaFile]);

  useEffect(() => {
    const selectedName = selectedTemplate?.name || "";
    const previousName = previousTemplateNameRef.current;
    if (!selectedName) {
      previousTemplateNameRef.current = "";
      return;
    }

    const nextBodyParamsLength = personalizeWithUserData
      ? Math.max(0, bodyParamCount - 1)
      : bodyParamCount;

    if (selectedName !== previousName) {
      const initialButtonInputs = {};
      const initialFlowTokens = {};
      dynamicButtons.forEach((button) => {
        initialButtonInputs[toButtonInputKey(button)] = Array.from({ length: button.paramCount }, () => "");
      });
      flowButtons.forEach((button) => {
        initialFlowTokens[toButtonInputKey(button)] = generateFlowToken();
      });

      updateDraftSection("template", {
        language: selectedTemplate.language || "en_US",
        bodyParams: Array.from({ length: nextBodyParamsLength }, () => ""),
        bodyParamCount,
        headerFormat,
        headerParamCount,
        headerText: "",
        mediaId: "",
        headerMediaFile: null,
        headerMediaFilename: "",
        templateButtons,
        buttonParamInputs: initialButtonInputs,
        flowButtonTokens: initialFlowTokens,
      });
      previousTemplateNameRef.current = selectedName;
      return;
    }

    const currentBodyParams = Array.isArray(templateDraft.bodyParams) ? templateDraft.bodyParams : [];
    if (currentBodyParams.length !== nextBodyParamsLength) {
      updateDraftSection("template", {
        bodyParams: Array.from(
          { length: nextBodyParamsLength },
          (_, index) => currentBodyParams[index] || ""
        ),
        bodyParamCount,
        headerFormat,
        headerParamCount,
        templateButtons,
      });
    } else {
      updateDraftSection("template", {
        bodyParamCount,
        headerFormat,
        headerParamCount,
        templateButtons,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, personalizeWithUserData, bodyParamCount]);

  const expectedBodyParamCount = personalizeWithUserData
    ? Math.max(0, bodyParamCount - 1)
    : bodyParamCount;
  const bodyParams = useMemo(
    () => (Array.isArray(templateDraft.bodyParams) ? templateDraft.bodyParams : []),
    [templateDraft.bodyParams]
  );
  const buttonParamInputs = useMemo(
    () => templateDraft.buttonParamInputs || {},
    [templateDraft.buttonParamInputs]
  );
  const flowButtonTokens = useMemo(
    () => templateDraft.flowButtonTokens || {},
    [templateDraft.flowButtonTokens]
  );

  const headerOk = (() => {
    if (!requiresHeaderInput) return true;
    if (hasDynamicTextHeader) return (templateDraft.headerText || "").trim().length > 0;
    if (hasMediaHeader) {
      return Boolean(templateDraft.headerMediaFile) || Boolean((templateDraft.mediaId || "").trim());
    }
    return true;
  })();
  const bodyOk =
    bodyParamCount === 0 ||
    (bodyParams.length === expectedBodyParamCount &&
      bodyParams.every((value) => (value || "").trim().length > 0));
  const buttonsOk = dynamicButtons.every((button) => {
    const values = buttonParamInputs[toButtonInputKey(button)] || [];
    return values.length === button.paramCount && values.every((value) => (value || "").trim().length > 0);
  });
  const flowButtonsOk = flowButtons.every((button) => {
    const key = toButtonInputKey(button);
    return (flowButtonTokens[key] || "").trim().length > 0;
  });

  const previewBodyText = useMemo(() => {
    const rawBody = extractBodyText(selectedTemplate);
    if (!rawBody) return "(No body)";
    return rawBody.replace(/\{\{(\d+)}}/g, (_, placeholderIndex) => {
      const numericIndex = Number(placeholderIndex);
      if (!Number.isFinite(numericIndex) || numericIndex < 1) {
        return `{{${placeholderIndex}}}`;
      }
      if (personalizeWithUserData && numericIndex === 1) {
        return "{{Name}}";
      }
      const bodyInputIndex = personalizeWithUserData ? numericIndex - 2 : numericIndex - 1;
      const value = (bodyParams[bodyInputIndex] || "").trim();
      return value || `{{${numericIndex}}}`;
    });
  }, [selectedTemplate, personalizeWithUserData, bodyParams]);

  const previewHeaderText = useMemo(() => {
    if (!selectedTemplate) return "";
    if (headerFormat === "TEXT") {
      if (hasDynamicTextHeader) return (templateDraft.headerText || "").trim() || "{{header}}";
      return (selectedTemplate.headerText || "").trim();
    }
    if (headerFormat === "IMAGE") return "";
    if (headerFormat) return `${headerFormat} HEADER`;
    return "";
  }, [selectedTemplate, headerFormat, hasDynamicTextHeader, templateDraft.headerText]);

  const previewButtons = useMemo(
    () =>
      templateButtons.map((button) => {
        const key = toButtonInputKey(button);
        const dynamicValues = (buttonParamInputs[key] || []).map((value) => (value || "").trim());
        return {
          ...button,
          resolvedUrl: button.url ? resolveUrlTemplate(button.url, dynamicValues) : "",
        };
      }),
    [templateButtons, buttonParamInputs]
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

  const handleBodyParamChange = (index, value) => {
    const next = [...bodyParams];
    next[index] = value;
    updateDraftSection("template", { bodyParams: next });
  };

  const handleButtonParamChange = (button, paramIndex, value) => {
    const key = toButtonInputKey(button);
    const current = Array.isArray(buttonParamInputs[key]) ? [...buttonParamInputs[key]] : [];
    current[paramIndex] = value;
    updateDraftSection("template", {
      buttonParamInputs: {
        ...buttonParamInputs,
        [key]: current,
      },
    });
  };

  const handleFlowTokenChange = (button, value) => {
    const key = toButtonInputKey(button);
    updateDraftSection("template", {
      flowButtonTokens: {
        ...flowButtonTokens,
        [key]: value,
      },
    });
  };

  const regenerateFlowToken = (button) => {
    const key = toButtonInputKey(button);
    updateDraftSection("template", {
      flowButtonTokens: {
        ...flowButtonTokens,
        [key]: generateFlowToken(),
      },
    });
  };

  const handleMediaIdChange = (value) => {
    if ((value || "").trim()) {
      updateDraftSection("template", {
        mediaId: value,
        headerMediaFile: null,
      });
      return;
    }
    updateDraftSection("template", { mediaId: value });
  };

  const handleMediaFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    const validation = isValidMediaFile(file, headerFormat);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setError("");
    updateDraftSection("template", {
      headerMediaFile: file,
      mediaId: "",
      headerMediaFilename: file.name || "",
    });
  };

  const handleRemoveMedia = () => {
    updateDraftSection("template", {
      headerMediaFile: null,
      headerMediaFilename: "",
    });
  };

  const handleContinue = () => {
    if (!templateDraft.templateName) {
      setError("Select a template before continuing.");
      return;
    }
    if (!headerOk) {
      setError("Header content is incomplete. Add required header text or media.");
      return;
    }
    if (!bodyOk) {
      setError("Fill all required body variables before continuing.");
      return;
    }
    if (!buttonsOk) {
      setError("Fill all dynamic button variables before continuing.");
      return;
    }
    if (!flowButtonsOk) {
      setError("Each flow button needs a flow token.");
      return;
    }
    setError("");
    navigate("/app/campaigns/new/review");
  };

  return (
    <CampaignWizardLayout
      activeStep="template"
      title="Template Selection"
      subtitle="Choose template, configure variables, preview as WhatsApp message."
    >
      {loading ? (
        <p style={{ margin: 0, color: "#64748b" }}>Loading templates...</p>
      ) : (
        <div className="campaign-template-layout">
          <div className="campaign-template-left">
            <div className="app-field-grid">
              <div className="app-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="templateName">Template</label>
                <select
                  id="templateName"
                  className="app-select"
                  value={templateDraft.templateName || ""}
                  onChange={(event) => updateDraftSection("template", { templateName: event.target.value })}
                >
                  <option value="">Select template</option>
                  {templates.map((template) => (
                    <option key={template.id || template.name} value={template.name}>
                      {template.name} ({template.language || "en_US"})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <>
                  <div className="app-field">
                    <label>Template Status</label>
                    <div className="app-inline">
                      <StatusBadge value={selectedTemplate.status || "active"} />
                      <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
                        {selectedTemplate.category || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="app-field">
                    <label htmlFor="language">Language</label>
                    <input id="language" className="app-input" value={templateDraft.language || "en_US"} readOnly />
                  </div>

                  {requiresHeaderInput && (
                    <div className="app-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Header Content ({headerFormat})</label>
                      {hasDynamicTextHeader ? (
                        <input
                          className="app-input"
                          value={templateDraft.headerText || ""}
                          onChange={(event) => updateDraftSection("template", { headerText: event.target.value })}
                          placeholder={`Enter header text (${headerParamCount} variable${headerParamCount !== 1 ? "s" : ""})`}
                        />
                      ) : (
                        <div className="template-media-card">
                          <div className="app-field">
                            <label htmlFor="mediaId">Media ID (optional)</label>
                            <input
                              id="mediaId"
                              className="app-input"
                              value={templateDraft.mediaId || ""}
                              onChange={(event) => handleMediaIdChange(event.target.value)}
                              placeholder="Use pre-uploaded media id if available"
                            />
                          </div>

                          <div className={`template-upload-zone ${(templateDraft.mediaId || "").trim() ? "disabled" : ""}`}>
                            {headerFormat === "IMAGE" && previewUrl ? (
                              <div className="template-upload-preview">
                                <img src={previewUrl} alt="Header preview" />
                                <button type="button" className="app-btn-danger" onClick={handleRemoveMedia}>
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <label htmlFor="template-header-media" className="template-upload-label">
                                <span>Upload {headerFormat.toLowerCase()} file</span>
                                <small>
                                  {headerFormat === "IMAGE"
                                    ? "PNG/JPG/WebP (max 5MB)"
                                    : headerFormat === "VIDEO"
                                      ? "Video (max 16MB)"
                                      : "Document (max 100MB)"}
                                </small>
                              </label>
                            )}
                            <input
                              id="template-header-media"
                              className="template-upload-input"
                              type="file"
                              disabled={Boolean((templateDraft.mediaId || "").trim())}
                              accept={
                                headerFormat === "IMAGE"
                                  ? "image/*"
                                  : headerFormat === "VIDEO"
                                    ? "video/*"
                                    : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                              }
                              onChange={handleMediaFileChange}
                            />
                          </div>

                          {headerFormat === "DOCUMENT" && (
                            <div className="app-field">
                              <label htmlFor="headerFilename">Document filename (optional)</label>
                              <input
                                id="headerFilename"
                                className="app-input"
                                value={templateDraft.headerMediaFilename || ""}
                                onChange={(event) =>
                                  updateDraftSection("template", { headerMediaFilename: event.target.value })
                                }
                                placeholder="Offer.pdf"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {bodyParamCount > 0 && (
                    <div className="app-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Body Variables</label>
                      <div className="app-inline" style={{ marginBottom: "0.4rem" }}>
                        <input
                          type="checkbox"
                          id="personalizeWithUserData"
                          checked={personalizeWithUserData}
                          onChange={(event) =>
                            updateDraftSection("template", { personalizeWithUserData: event.target.checked })
                          }
                        />
                        <label htmlFor="personalizeWithUserData" style={{ margin: 0 }}>
                          Auto-fill first variable with user name
                        </label>
                      </div>
                      <div className="app-field-grid">
                        {bodyParams.map((value, index) => (
                          <div key={`body-param-${index}`} className="app-field">
                            <label htmlFor={`body-param-${index}`}>Variable {personalizeWithUserData ? index + 2 : index + 1}</label>
                            <input
                              id={`body-param-${index}`}
                              className="app-input"
                              value={value}
                              onChange={(event) => handleBodyParamChange(index, event.target.value)}
                              placeholder={`Value for variable ${personalizeWithUserData ? index + 2 : index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dynamicButtons.length > 0 && (
                    <div className="app-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Button Variables</label>
                      <div className="template-chip-list">
                        {dynamicButtons.map((button) => {
                          const key = toButtonInputKey(button);
                          const values = buttonParamInputs[key] || [];
                          return (
                            <div key={`button-input-${key}`} className="template-chip">
                              <strong>
                                {button.text || `Button ${button.index + 1}`} ({button.type})
                              </strong>
                              {Array.from({ length: button.paramCount }).map((_, paramIndex) => (
                                <input
                                  key={`${key}-${paramIndex}`}
                                  className="app-input"
                                  value={values[paramIndex] || ""}
                                  onChange={(event) =>
                                    handleButtonParamChange(button, paramIndex, event.target.value)
                                  }
                                  placeholder={`Button variable ${paramIndex + 1}`}
                                />
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {flowButtons.length > 0 && (
                    <div className="app-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Flow Button Settings</label>
                      <div className="template-chip-list">
                        {flowButtons.map((button) => {
                          const key = toButtonInputKey(button);
                          return (
                            <div key={`flow-button-${key}`} className="template-chip">
                              <strong>{button.text || `Button ${button.index + 1}`} (FLOW)</strong>
                              <span>{button.flowName || button.flowId || "Flow not linked"}</span>
                              {button.flowAction ? <span>Action: {button.flowAction}</span> : null}
                              <div className="template-flow-row">
                                <input
                                  className="app-input"
                                  value={flowButtonTokens[key] || ""}
                                  onChange={(event) => handleFlowTokenChange(button, event.target.value)}
                                  placeholder="flow_token"
                                />
                                <button type="button" className="app-btn-secondary" onClick={() => regenerateFlowToken(button)}>
                                  Regenerate
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <aside className="campaign-template-preview">
            <div className="wa-preview-shell">
              {!selectedTemplate ? (
                <div className="app-empty">Select a template to see WhatsApp preview.</div>
              ) : (
                <>
                  <div className="wa-preview-label">Your template</div>
                  <div className="wa-device">
                    <div className="wa-bubble">
                      {headerFormat === "IMAGE" && (
                        <div className="wa-image-wrap">
                          {previewUrl ? (
                            <img src={previewUrl} alt="Template header preview" className="wa-image-preview" />
                          ) : (
                            <div className="wa-image-placeholder">
                              {(templateDraft.mediaId || "").trim()
                                ? "Image selected via media ID."
                                : "Upload an image to preview header."}
                            </div>
                          )}
                        </div>
                      )}
                      {previewHeaderText ? <div className="wa-header">{previewHeaderText}</div> : null}
                      <div className="wa-body">{previewBodyText}</div>
                      <div className="wa-footer-row">
                        <span className="wa-footer">{selectedTemplate.footer || ""}</span>
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
                                {button.type === "FLOW"
                                  ? "🗎"
                                  : button.type === "URL"
                                    ? "↗"
                                    : button.type === "PHONE_NUMBER"
                                      ? "📞"
                                      : "•"}
                              </span>
                              <span className="wa-button-text">{button.text || `Button ${button.index + 1}`}</span>
                            </button>
                          ))}
                        </div>
                      )}
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
          </aside>
        </div>
      )}

      {error && <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: "0.6rem" }}>{error}</p>}

      <div className="app-inline-actions">
        <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/campaigns/new/audience")}>
          Back
        </button>
        <button type="button" className="app-btn-primary" onClick={handleContinue}>
          Continue to Review
        </button>
      </div>
    </CampaignWizardLayout>
  );
}

export default CampaignTemplateStepPage;
