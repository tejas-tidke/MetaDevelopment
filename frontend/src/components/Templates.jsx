import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthProtection } from '../hooks/useAuthProtection';
import api from '../services/api';
import WorkspaceHeader from './WorkspaceHeader';
import AppCard from './ui/AppCard';
import AppButton from './ui/AppButton';
import AppAlert from './ui/AppAlert';
import PageLayout from './ui/PageLayout';

function Templates() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Protect this component from unauthorized access
  useAuthProtection();

  // Get file ID from location state
  const fileId = location.state?.fileId;
  const selectedFromState = location.state?.selected;
  
  // Initialize selected users as empty array
  const [selected, setSelected] = useState([]);
  
  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  // Header inputs (depending on template header requirement)
  const [headerText, setHeaderText] = useState("");
  const [headerMediaUrl, setHeaderMediaUrl] = useState("");
  const [headerMediaFilename, setHeaderMediaFilename] = useState("");
  const [headerMediaFile, setHeaderMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaId, setMediaId] = useState(""); // New state for media ID
  const [personalizeWithUserData, setPersonalizeWithUserData] = useState(true); // New state for personalization
  // Body variables
  const [bodyParams, setBodyParams] = useState([]);
  // Dynamic button variables keyed by button index -> array of values
  const [buttonParamInputs, setButtonParamInputs] = useState({});

  const normalizeUsers = (users) =>
    (users || []).map((user, index) => ({
      id: user?.id ?? `selected-${index}`,
      name: user?.name ?? "",
      phoneNo: user?.phoneNo ?? user?.phone ?? "",
      email: user?.email ?? "",
      companyName: user?.companyName ?? user?.company ?? ""
    }));

  const toButtonInputKey = (button) => String(button?.index ?? "");

  const getTemplateButtons = (template) => {
    if (!template || !Array.isArray(template.buttons)) return [];
    return template.buttons.map((button, idx) => ({
      index: Number.isFinite(Number(button?.index)) ? Number(button.index) : idx,
      type: (button?.type || "").toUpperCase(),
      text: button?.text || "",
      url: button?.url || "",
      phoneNumber: button?.phoneNumber || "",
      flowId: button?.flowId || "",
      flowName: button?.flowName || "",
      flowAction: button?.flowAction || "",
      navigateScreen: button?.navigateScreen || "",
      paramCount: Number(button?.paramCount || 0),
      parameterType: button?.parameterType || "text"
    }));
  };

  const countTemplatePlaceholders = (text) => {
    if (!text) return 0;
    const matches = text.match(/\{\{\s*[^{}]+\s*}}/g);
    return matches ? matches.length : 0;
  };

  // Prefer users passed from ExistingList; fallback to file-based users when fileId is provided.
  useEffect(() => {
    if (Array.isArray(selectedFromState) && selectedFromState.length > 0) {
      setSelected(normalizeUsers(selectedFromState));
      return;
    }

    if (fileId) {
      const fetchUserData = async () => {
        try {
          const response = await api.get(`/files/${fileId}/user-details`);
          if (response.data?.status === "success") {
            setSelected(normalizeUsers(response.data.data || []));
          } else {
            setSelected([]);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setSelected([]);
        }
      };
      fetchUserData();
    } else {
      setSelected([]);
    }
  }, [fileId, selectedFromState]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setTplLoading(true);
        const res = await api.get("/waba/templates");
        if (res.data?.status === "success") {
          setTemplates(res.data.data || []);
        } else {
          setTplError(res.data?.message || "Failed to fetch templates");
        }
      } catch (e) {
        console.error("Error fetching templates", e);
        setTplError("Error fetching templates");
      } finally {
        setTplLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  // Reset header inputs when switching templates
  useEffect(() => {
    setHeaderText("");
    setHeaderMediaUrl("");
    setHeaderMediaFilename("");
    setHeaderMediaFile(null);
    setPreviewUrl("");
    // Initialize body params length
    const declaredCount = Number(selectedTemplate?.bodyParamCount || 0);
    const cnt = declaredCount > 0 ? declaredCount : countTemplatePlaceholders(selectedTemplate?.body || "");
    // If personalization is enabled, we don't need the first parameter (it will be auto-filled with user's name)
    const adjustedCount = personalizeWithUserData && cnt > 0 ? cnt - 1 : cnt;
    setBodyParams(Array.from({ length: adjustedCount }, () => ""));

    const templateButtons = getTemplateButtons(selectedTemplate);
    const initialButtonInputs = {};
    templateButtons.forEach((button) => {
      if ((button.paramCount || 0) > 0) {
        initialButtonInputs[toButtonInputKey(button)] = Array.from(
          { length: button.paramCount },
          () => ""
        );
      }
    });
    setButtonParamInputs(initialButtonInputs);
  }, [selectedTemplate, personalizeWithUserData]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.match('image.*')) {
        alert('Please upload an image file (JPEG, PNG, etc.)');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      setHeaderMediaFile(file);
      const objectUrl = URL.createObjectURL(file);
      setHeaderMediaUrl(objectUrl);
      setPreviewUrl(objectUrl);
      setMediaId(""); // Clear media ID when uploading a file
    }
  };

  const handleRemoveImage = () => {
    setHeaderMediaFile(null);
    setHeaderMediaUrl("");
    setPreviewUrl("");
    // Clear the file input
    const fileInput = document.getElementById('banner-upload');
    if (fileInput) fileInput.value = '';
  };

  const recipients = (selected || [])
    .map(u => (u.phoneNo || "").toString().trim())
    .filter(p => p.length > 0);

  const headerFormat = (selectedTemplate?.headerFormat || "").toUpperCase();
  const bodyParamCount = (() => {
    const declaredCount = Number(selectedTemplate?.bodyParamCount || 0);
    if (declaredCount > 0) return declaredCount;
    return countTemplatePlaceholders(selectedTemplate?.body || "");
  })();
  const headerParamCount = Number(selectedTemplate?.headerParamCount || 0);
  const templateButtons = getTemplateButtons(selectedTemplate);
  const dynamicButtons = templateButtons.filter((button) => (button.paramCount || 0) > 0);
  const hasDynamicTextHeader = headerFormat === "TEXT" && headerParamCount > 0;
  const hasMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);
  const requiresHeaderInput = hasDynamicTextHeader || hasMediaHeader;
  const headerOk = (() => {
    if (!requiresHeaderInput) return true;
    if (hasDynamicTextHeader) return headerText.trim().length > 0;
    if (hasMediaHeader) {
      // For media headers, either a file should be uploaded or a media ID should be provided
      return (headerMediaUrl.trim().length > 0 && headerMediaFile) || mediaId.trim().length > 0;
    }
    return true;
  })();
  
  // Adjust the body parameter count validation for personalization
  const expectedBodyParamCount = personalizeWithUserData && bodyParamCount > 0 ? bodyParamCount - 1 : bodyParamCount;
  const bodyOk = bodyParamCount === 0 || (Array.isArray(bodyParams) && bodyParams.length === expectedBodyParamCount && bodyParams.every(v => v.trim().length > 0));
  const buttonsOk = dynamicButtons.every((button) => {
    const key = toButtonInputKey(button);
    const values = buttonParamInputs[key] || [];
    return values.length === button.paramCount && values.every((value) => (value || "").trim().length > 0);
  });
  const canSend = !!selectedTemplate && recipients.length > 0 && headerOk && bodyOk && buttonsOk && !sending;

  const resolveUrlTemplate = (urlTemplate, values = []) => {
    if (!urlTemplate) return "";
    let valueCursor = 0;
    return urlTemplate.replace(/\{\{\d+}}/g, () => {
      const replacement = (values[valueCursor] || "").trim();
      valueCursor += 1;
      return replacement || "{{value}}";
    });
  };

  const previewBodyText = (() => {
    const rawBody = selectedTemplate?.body || "";
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
  })();

  const previewHeaderText = (() => {
    if (!selectedTemplate) return "";
    if (headerFormat === "TEXT") {
      if (hasDynamicTextHeader) {
        return headerText.trim() || "{{header}}";
      }
      return (selectedTemplate.headerText || "").trim();
    }
    if (headerFormat === "IMAGE") {
      return "";
    }
    if (headerFormat) {
      return `${headerFormat} HEADER`;
    }
    return "";
  })();

  const previewButtons = templateButtons.map((button) => {
    const key = toButtonInputKey(button);
    const dynamicValues = (buttonParamInputs[key] || []).map((v) => (v || "").trim());
    return {
      ...button,
      resolvedUrl: button.url ? resolveUrlTemplate(button.url, dynamicValues) : ""
    };
  });

  const previewTime = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());

  const toFriendlySendError = (rawError) => {
    const msg = (rawError || "").toString();
    const lower = msg.toLowerCase();

    if (
      lower.includes("number of localizable_params") ||
      lower.includes("does not match the expected number of params") ||
      lower.includes("number of parameters does not match")
    ) {
      return "Template variables are incomplete. Please fill all required fields and try again.";
    }
    if (lower.includes("401 unauthorized") || lower.includes("auth_failed") || lower.includes("authentication failed")) {
      return "WhatsApp authentication failed. Please reconnect your WhatsApp access token.";
    }
    if (lower.includes("rate limit")) {
      return "Too many requests were sent quickly. Please wait a moment and try again.";
    }
    if (lower.includes("unsupported post request") || lower.includes("phone-number-id")) {
      return "WhatsApp account configuration looks incorrect. Please verify your phone number setup.";
    }
    if (lower.includes("recipient") && lower.includes("invalid")) {
      return "One or more recipient phone numbers are invalid.";
    }

    return "Unable to send message right now. Please check your template inputs and try again.";
  };

  // First, let's update the header parameters in the handleSend function
  const handleSend = async () => {
    if (!selectedTemplate) return;
    if (recipients.length === 0) {
      alert("No phone numbers available in the selected users.");
      return;
    }
    
    try {
      setSendResult(null);
      setSending(true);
      
      // If there's a file to upload, handle it first
      let mediaUrl = headerMediaUrl;
      let resolvedMediaId = mediaId.trim();
      
      // Only upload file if a file is selected and no media ID is provided
      if (headerMediaFile && !resolvedMediaId) {
        try {
          const formData = new FormData();
          formData.append('file', headerMediaFile);
          
          // Use the media upload endpoint for template media files
          const uploadResponse = await api.post('/upload/media', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          // Check if the upload was successful and require media id from backend.
          if (uploadResponse.data && uploadResponse.data.status === "success" && uploadResponse.data.file) {
            // Preferred: Meta media ID returned from backend after Cloud API upload.
            if (uploadResponse.data.mediaId) {
              resolvedMediaId = String(uploadResponse.data.mediaId).trim();
            }

            if (!resolvedMediaId) {
              throw new Error("Media ID was not returned by backend. Please restart backend and try again.");
            }
          } else {
            throw new Error(uploadResponse.data?.message || 'No URL returned from server');
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          setSendResult({
            status: 'error',
            message: "Could not upload image. Please try again."
          });
          setSending(false);
          return;
        }
      }

      const payload = {
        templateName: selectedTemplate.name,
        language: selectedTemplate.language,
        to: recipients,
        personalizeWithUserData: personalizeWithUserData // Add personalization flag
      };

      // Add mediaId to payload if provided
      if (resolvedMediaId) {
        payload.mediaId = resolvedMediaId;
      }

    // Initialize parameters array
    let parameters = [];

    // Handle header parameters first (if any)
    if (hasDynamicTextHeader && headerText.trim()) {
      payload.headerFormat = "TEXT";
      payload.headerText = headerText.trim();
    } else if (hasMediaHeader && (mediaUrl.trim() || resolvedMediaId)) {
      payload.headerFormat = headerFormat;
        // For media headers, create the correct parameter structure
        const mediaParam = {
          type: headerFormat.toLowerCase()
        };
        
        // Use media ID if provided, otherwise use URL
        if (resolvedMediaId) {
          mediaParam[headerFormat.toLowerCase()] = {
            id: resolvedMediaId
          };
        } else {
          mediaParam[headerFormat.toLowerCase()] = {
            link: mediaUrl.trim(),
            ...(headerFormat === "DOCUMENT" && headerMediaFilename.trim() ? { 
              filename: headerMediaFilename.trim() 
            } : {})
          };
        }
        
        // Log the payload for debugging
        console.log('Media parameter:', mediaParam);
        
        // Add to parameters array as the first parameter
      parameters.unshift(mediaParam);
    }

    // Add body parameters
    if (bodyParamCount > 0) {
      // If personalization is enabled, we need to add the name placeholder at the beginning
      let bodyParamsList = [];
      
      if (personalizeWithUserData) {
        // Add the name placeholder first
        bodyParamsList.push({ type: "text", text: "{{1}}" });
      }
      
      // Add the user-provided parameters
      const userParams = bodyParams
        .filter(p => p.trim().length > 0)
        .map(p => ({ type: "text", text: p.trim() }));
      
      bodyParamsList = [...bodyParamsList, ...userParams];
      parameters = [...parameters, ...bodyParamsList];
    }

    const buildButtonParam = (parameterType, value) => {
      const normalizedType = (parameterType || "text").toLowerCase();
      if (normalizedType === "payload") {
        return { type: "payload", payload: value };
      }
      if (normalizedType === "coupon_code") {
        return { type: "coupon_code", coupon_code: value };
      }
      return { type: "text", text: value };
    };

    const buttonParameters = dynamicButtons
      .map((button) => {
        const key = toButtonInputKey(button);
        const values = (buttonParamInputs[key] || []).map((v) => (v || "").trim()).filter(Boolean);
        if (values.length === 0) return null;

        return {
          index: String(button.index),
          subType: (button.type || "").toLowerCase(),
          parameters: values.map((value) => buildButtonParam(button.parameterType, value))
        };
      })
      .filter(Boolean);

    // Only add parameters if we have any
    if (parameters.length > 0) {
      payload.parameters = parameters;
    }

    if (buttonParameters.length > 0) {
      payload.buttonParameters = buttonParameters;
    }
    
    // Log the payload for debugging
    console.log('=== TEMPLATE SEND DEBUG ===');
    console.log('Sending payload to backend:', payload);
    console.log('Parameters:', parameters);
    console.log('=== END TEMPLATE SEND DEBUG ===');

    const res = await api.post("/waba/send-template", payload);
    
    // Enhance the success message
    if (res.data && res.data.status === 'success') {
      setSendResult({
        status: 'success',
        message: `Message sent successfully to ${res.data.sent} recipient(s)!`
      });

      // Move to "View All Data" page after successful send.
      setTimeout(() => {
        navigate('/existing-list');
      }, 1000);
    } else if (res.data && res.data.status === 'partial_success') {
      const firstError = Array.isArray(res.data.errors) && res.data.errors.length > 0
        ? res.data.errors[0]
        : null;
      const userHint = firstError
        ? toFriendlySendError(firstError.userMessage || firstError.error || "")
        : "Some messages could not be delivered.";
      setSendResult({
        status: 'partial_success',
        message: `Partially sent: ${res.data.sent} successful, ${res.data.failed} failed. ${userHint}`
      });
    } else {
      const firstError = Array.isArray(res.data?.errors) && res.data.errors.length > 0
        ? res.data.errors[0]
        : null;
      const fallback = res.data?.message || "";
      const userMessage = firstError
        ? toFriendlySendError(firstError.userMessage || firstError.error || "")
        : toFriendlySendError(fallback);
      setSendResult({
        status: "error",
        message: userMessage
      });
    }
    } catch (e) {
      const rawError =
        e?.response?.data?.errors?.[0]?.userMessage ||
        e?.response?.data?.errors?.[0]?.error ||
        e?.response?.data?.message ||
        e?.message;
      setSendResult({ 
        status: "error", 
        message: toFriendlySendError(rawError)
      });
      console.error("Send error:", e.response?.data || e);
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout className="h-screen overflow-hidden" shellClassName="shell-xl h-full flex flex-col">
      <WorkspaceHeader
        title="Templates"
        subtitle="Choose a template, add variables, and send messages to selected recipients."
        backFallback="/existing-list"
      />

      <div className="min-h-0 flex-1 pb-6 grid grid-cols-1 xl:grid-cols-12 gap-4">
        <AppCard className="overflow-hidden flex flex-col self-start xl:col-span-3">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Selected People</h2>
            <p className="mt-1 text-xs text-gray-500">
              {selected.length} recipient{selected.length === 1 ? "" : "s"} selected
            </p>
          </div>

          <div className="p-4">
            {selected.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <p className="text-sm text-gray-600">
                  No people selected yet.
                </p>
                <AppButton
                  onClick={() => navigate("/existing-list")}
                  variant="secondary"
                  size="sm"
                >
                  Go to Existing List
                </AppButton>
              </div>
            ) : (
              <ul className="space-y-2">
                {selected.map((u, idx) => (
                  <li key={u.id ?? `selected-${idx}`} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white">
                    <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-semibold shrink-0">
                      {(u.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.name || "-"}</p>
                      <p className="text-xs text-gray-600 truncate">{u.phoneNo || "-"}</p>
                      <p className="text-xs text-gray-500 truncate">{u.companyName || "-"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AppCard>

        <div className="min-h-0 h-full overflow-auto xl:col-span-9 pr-1">
          <AppCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">WhatsApp Templates</h2>
              <span className="text-xs text-gray-600">{templates.length} available</span>
            </div>
            {tplLoading ? (
              <div className="p-6 flex items-center gap-2 text-gray-600 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                Loading templates...
              </div>
            ) : tplError ? (
              <div className="p-6 text-sm text-red-700 bg-red-50 border border-red-200">{tplError}</div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No templates found for your account.</div>
            ) : (
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((t, idx) => (
                  <div
                    key={(t.name || "template") + "-" + idx}
                    onClick={() => setSelectedTemplate(t)}
                    className={`cursor-pointer bg-white rounded-xl shadow p-5 border ${
                      selectedTemplate?.name === t.name ? "border-blue-500 ring-1 ring-blue-300" : "border-gray-100"
                    } hover:shadow-md transition`}
                    title={t.body}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-gray-900">{t.name || "(Unnamed)"}</h3>
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-700">{t.language || "-"}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 capitalize flex items-center gap-2">
                      <span>{t.category || ""}</span>
                      {t.headerFormat && (
                        <span className="inline-flex items-center px-1 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700 border border-blue-100">
                          header: {t.headerFormat}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-gray-700">
                      <div className="max-h-16 overflow-hidden whitespace-pre-wrap">
                        {t.body || "(No body)"}
                      </div>
                    </div>
                    {(t.bodyParamCount > 0 || t.headerParamCount > 0 || t.buttonCount > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1">
                        {Array.from({ length: t.bodyParamCount }).map((_, i) => (
                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-green-50 text-green-700 border border-green-100">
                            Body {i + 1}
                          </span>
                        ))}
                        {t.headerParamCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700 border border-amber-100">
                            Header {t.headerParamCount}
                          </span>
                        )}
                        {t.buttonCount > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Buttons {t.buttonCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AppCard>
        </div>
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 p-3 sm:p-6">
          <div className="mx-auto h-full max-w-7xl">
            <div className="workspace-card h-full overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <h2 className="text-lg font-semibold text-gray-800 truncate">{selectedTemplate.name || "Template Details"}</h2>
                  <p className="text-xs text-gray-500 mt-1">Preview on the left and all template variables on the right.</p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close template modal"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[1.1fr_1fr]">
                <div className="min-h-0 overflow-auto p-5 border-b xl:border-b-0 xl:border-r border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-2">Template Preview</div>
                  <div
                    className="rounded-2xl border border-gray-200 p-3"
                    style={{
                      backgroundColor: "#e9e4dd",
                      backgroundImage:
                        "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.04) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.035) 1px, transparent 1px)",
                      backgroundSize: "18px 18px, 22px 22px"
                    }}
                  >
                    <div className="mx-auto max-w-[320px] rounded-[12px] border border-[#d7d7d7] bg-[#f8f8f8] shadow-[0_1px_2px_rgba(0,0,0,0.08)] overflow-hidden">
                      <div className="px-3 py-3 bg-[#f7f7f7]">
                        {headerFormat === "IMAGE" && (
                          <div className="mb-3 rounded-md overflow-hidden border border-slate-200 bg-white">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt="Template header preview"
                                className="w-full max-h-56 object-contain bg-white"
                              />
                            ) : (
                              <div className="h-36 flex items-center justify-center text-[12px] text-slate-500 px-3 text-center">
                                {mediaId.trim()
                                  ? "Image selected via Media ID. Upload image file to see preview."
                                  : "Upload an image to preview header."}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="text-[14px] leading-7 text-[#1f2937] whitespace-pre-line">
                          {previewHeaderText ? `${previewHeaderText}\n\n${previewBodyText}` : previewBodyText}
                        </div>
                        <div className="mt-2 flex items-end justify-between text-[12px] text-[#7b8490]">
                          <span className="truncate pr-2">{selectedTemplate.footer || ""}</span>
                          <span className="shrink-0">{previewTime}</span>
                        </div>
                      </div>

                      {previewButtons.length > 0 && (
                        <div className="border-t border-[#d5d5d5] bg-[#f7f7f7] divide-y divide-[#e0e0e0]">
                          {previewButtons.map((button) => (
                            <button
                              key={`preview-button-${button.index}`}
                              type="button"
                              className="w-full px-3 py-2 flex items-center justify-center gap-2 text-[#1185e0] hover:bg-[#f1f1f1] transition-colors"
                              title={button.resolvedUrl || button.url || ""}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5h5m0 0v5m0-5L10 14" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12v7h7" />
                              </svg>
                              <span className="text-[16px] font-medium leading-none">
                                {button.text || `Button ${button.index + 1}`}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {previewButtons.some((button) => button.url) && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="text-[11px] font-medium text-slate-700 mb-1">Button URL(s)</div>
                      <div className="space-y-1">
                        {previewButtons
                          .filter((button) => button.url)
                          .map((button) => (
                            <div key={`preview-url-${button.index}`} className="text-[11px] text-slate-600 break-all">
                              Button {button.index + 1}: {button.resolvedUrl || button.url}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {headerFormat === "TEXT" && headerParamCount === 0 && (
                    <div className="mt-2 text-xs text-emerald-700">
                      This template uses a fixed header. No header input is required.
                    </div>
                  )}
                </div>

                <div className="min-h-0 overflow-auto p-5 space-y-6">
                  {requiresHeaderInput && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Header Content
                        </label>
                        <span className="text-xs text-gray-500">
                          {headerFormat} {hasDynamicTextHeader ? `(${headerParamCount} variable${headerParamCount !== 1 ? 's' : ''})` : ''}
                        </span>
                      </div>

                      {hasDynamicTextHeader ? (
                        <input
                          type="text"
                          value={headerText}
                          onChange={e => setHeaderText(e.target.value)}
                          placeholder={`Enter header text with ${headerParamCount} variable${headerParamCount !== 1 ? 's' : ''}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      ) : (
                        <div className="space-y-3">
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Media ID (optional)
                            </label>
                            <input
                              type="text"
                              value={mediaId}
                              onChange={e => {
                                setMediaId(e.target.value);
                                if (e.target.value.trim()) {
                                  setHeaderMediaFile(null);
                                  setHeaderMediaUrl("");
                                  setPreviewUrl("");
                                  const fileInput = document.getElementById('banner-upload');
                                  if (fileInput) fileInput.value = '';
                                }
                              }}
                              placeholder="Enter pre-existing media ID (e.g., 774955485440022)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              If you have a pre-existing media ID, enter it above. Otherwise, upload a file below.
                            </p>
                          </div>

                          <div className={`border-t pt-3 ${mediaId.trim() ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Or Upload Media File
                            </label>
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  {previewUrl ? (
                                    <div className="relative">
                                      <img src={previewUrl} alt="Preview" className="h-16 w-auto rounded" />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleRemoveImage();
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                      <p className="mb-1 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span>
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {headerFormat === "IMAGE" ? "PNG, JPG (MAX. 5MB)" :
                                         headerFormat === "VIDEO" ? "MP4, 3GPP (MAX. 16MB)" :
                                         "PDF, DOCX, PPTX, XLSX (MAX. 100MB)"}
                                      </p>
                                    </>
                                  )}
                                </div>
                                <input
                                  id="banner-upload"
                                  type="file"
                                  className="hidden"
                                  accept={headerFormat === "IMAGE" ? "image/*" :
                                         headerFormat === "VIDEO" ? "video/*" :
                                         ".pdf,.docx,.pptx,.xlsx"}
                                  onChange={handleFileUpload}
                                  disabled={!!mediaId.trim()}
                                />
                              </label>
                            </div>
                          </div>

                          {headerFormat === "DOCUMENT" && (
                            <input
                              type="text"
                              value={headerMediaFilename}
                              onChange={e => setHeaderMediaFilename(e.target.value)}
                              placeholder="Optional document filename (e.g. Offer.pdf)"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
                          <div className="text-[11px] text-gray-500">
                            {headerFormat === "IMAGE"
                              ? "Upload an image (max 5MB, JPG/PNG/WebP)"
                              : headerFormat === "DOCUMENT"
                                ? "Upload a document (max 100MB, PDF/DOCX/PPTX/XLSX)"
                                : "Upload a video (max 16MB, MP4/3GPP)"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {bodyParamCount > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Body Variables
                        </label>
                        <span className="text-xs text-gray-500">
                          {personalizeWithUserData && bodyParamCount > 0 ? bodyParamCount - 1 : bodyParamCount} variable{bodyParamCount !== 1 ? 's' : ''}
                          {personalizeWithUserData && bodyParamCount > 0 ? ' (excluding auto-filled name)' : ''}
                        </span>
                      </div>

                      <div className="mb-3">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={personalizeWithUserData}
                            onChange={(e) => setPersonalizeWithUserData(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Personalize with user data (replaces &#123;&#123;1&#125;&#125; with user's name)
                          </span>
                        </label>
                      </div>

                      <div className="space-y-3">
                        {bodyParams.map((param, index) => (
                          <div key={index}>
                            <label className="block text-xs text-gray-500 mb-1">
                              Variable {personalizeWithUserData ? index + 2 : index + 1}
                            </label>
                            <input
                              type="text"
                              value={param}
                              onChange={e => {
                                const newParams = [...bodyParams];
                                newParams[index] = e.target.value;
                                setBodyParams(newParams);
                              }}
                              placeholder={`Enter value for variable ${personalizeWithUserData ? index + 2 : index + 1}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dynamicButtons.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Button Variables
                        </label>
                        <span className="text-xs text-gray-500">
                          {dynamicButtons.length} dynamic button{dynamicButtons.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {dynamicButtons.map((button) => {
                          const key = toButtonInputKey(button);
                          const values = buttonParamInputs[key] || [];
                          return (
                            <div key={`button-input-${key}`} className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/40">
                              <div className="text-xs font-medium text-indigo-800 mb-2">
                                {button.text || `Button ${button.index + 1}`} ({button.type}){button.url ? ` - ${button.url}` : ""}
                              </div>
                              <div className="space-y-2">
                                {Array.from({ length: button.paramCount }).map((_, paramIndex) => (
                                  <input
                                    key={`${key}-${paramIndex}`}
                                    type="text"
                                    value={values[paramIndex] || ""}
                                    onChange={(e) => {
                                      const next = [...values];
                                      next[paramIndex] = e.target.value;
                                      setButtonParamInputs((prev) => ({
                                        ...prev,
                                        [key]: next
                                      }));
                                    }}
                                    placeholder={`Enter value for button variable ${paramIndex + 1}`}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3">
                    {sendResult && (
                      <AppAlert
                        tone={
                          sendResult.status === "success"
                            ? "success"
                            : sendResult.status === "partial_success"
                              ? "warn"
                              : "error"
                        }
                        title={
                          sendResult.status === "success"
                            ? "Message Sent"
                            : sendResult.status === "partial_success"
                              ? "Partial Success"
                              : "Send Failed"
                        }
                        toastKey={`${sendResult.status}:${sendResult.message}`}
                        onClose={() => setSendResult(null)}
                      >
                        {sendResult.message}
                      </AppAlert>
                    )}
                    <AppButton
                      onClick={handleSend}
                      disabled={!canSend}
                      variant="primary"
                    >
                      {sending ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </span>
                      ) : 'Send Message'}
                    </AppButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default Templates;



