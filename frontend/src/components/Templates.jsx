import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthProtection } from '../hooks/useAuthProtection';
import api from '../services/api';

function Templates() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Protect this component from unauthorized access
  useAuthProtection();

  const selected = location.state?.selected || [];
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
    const cnt = Number(selectedTemplate?.bodyParamCount || 0);
    // If personalization is enabled, we don't need the first parameter (it will be auto-filled with user's name)
    const adjustedCount = personalizeWithUserData && cnt > 0 ? cnt - 1 : cnt;
    setBodyParams(Array.from({ length: adjustedCount }, () => ""));
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
  const bodyParamCount = Number(selectedTemplate?.bodyParamCount || 0);
  const headerParamCount = Number(selectedTemplate?.headerParamCount || 0);
  const headerOk = (() => {
    if (!headerFormat) return true;
    // TEXT header must be filled only if it has placeholders
    if (headerFormat === "TEXT") return headerParamCount === 0 || headerText.trim().length > 0;
    if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat)) {
      // For media headers, either a file should be uploaded or a media ID should be provided
      return (headerMediaUrl.trim().length > 0 && headerMediaFile) || mediaId.trim().length > 0;
    }
    return true;
  })();
  
  // Adjust the body parameter count validation for personalization
  const expectedBodyParamCount = personalizeWithUserData && bodyParamCount > 0 ? bodyParamCount - 1 : bodyParamCount;
  const bodyOk = bodyParamCount === 0 || (Array.isArray(bodyParams) && bodyParams.length === expectedBodyParamCount && bodyParams.every(v => v.trim().length > 0));
  const canSend = !!selectedTemplate && recipients.length > 0 && headerOk && bodyOk && !sending;

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
      
      // Only upload file if a file is selected and no media ID is provided
      if (headerMediaFile && !mediaId.trim()) {
        try {
          const formData = new FormData();
          formData.append('file', headerMediaFile);
          
          // Use the media upload endpoint for template media files
          const uploadResponse = await api.post('/upload/media', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          // Check if the upload was successful and get the URL
          if (uploadResponse.data && uploadResponse.data.status === "success" && uploadResponse.data.file) {
            // Construct the full URL for the uploaded file
            // Note: uploads are served directly from /uploads/ not /api/uploads/ due to resource handler configuration
            mediaUrl = `http://localhost:8080/uploads/${uploadResponse.data.file.fileName}`;
          } else {
            throw new Error(uploadResponse.data?.message || 'No URL returned from server');
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          setSendResult({
            status: 'error',
            message: 'Failed to upload image. Please try again.'
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
      if (mediaId.trim()) {
        payload.mediaId = mediaId.trim();
      }

    // Initialize parameters array
    let parameters = [];

    // Handle header parameters first (if any)
    if (headerFormat) {
      payload.headerFormat = headerFormat;
      
      if (headerFormat === "TEXT" && headerText.trim()) {
        // For text headers, just set the headerText
        payload.headerText = headerText.trim();
      } 
      else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat) && 
              (mediaUrl.trim() || mediaId.trim())) {
        // For media headers, create the correct parameter structure
        const mediaParam = {
          type: headerFormat.toLowerCase()
        };
        
        // Use media ID if provided, otherwise use URL
        if (mediaId.trim()) {
          mediaParam[headerFormat.toLowerCase()] = {
            id: mediaId.trim()
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

    // Only add parameters if we have any
    if (parameters.length > 0) {
      payload.parameters = parameters;
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
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setSendResult(null);
      }, 5000);
    } else if (res.data && res.data.status === 'partial_success') {
      setSendResult({
        status: 'partial_success',
        message: `Partially sent: ${res.data.sent} successful, ${res.data.failed} failed`
      });
    } else {
      setSendResult(res.data);
    }
    } catch (e) {
      setSendResult({ 
        status: "error", 
        message: e.response?.data?.message || e.message || "Failed to send message" 
      });
      console.error("Send error:", e.response?.data || e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
            <p className="text-gray-600 mt-1 text-sm">Choose a template to proceed. Sample content is shown below.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>

        {/* Selected People Summary */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Selected People</h2>
            <span className="text-xs text-gray-600">{selected.length} selected</span>
          </div>
          <div className="px-5 py-4">
            {selected.length === 0 ? (
              <div className="text-sm text-gray-600">
                No selection received. Go back to the existing list and pick at least one person.
                <button
                  onClick={() => navigate("/existing-list")}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Go to Existing List
                </button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selected.map((u, idx) => (
                  <li key={u.id ?? idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-semibold">
                      {(u.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.name || "-"}</div>
                      <div className="text-xs text-gray-600">{u.email || "-"}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* WhatsApp Templates */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-700">{t.language || "—"}</span>
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
                  {(t.bodyParamCount > 0 || t.headerParamCount > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1">
                      {Array.from({ length: t.bodyParamCount }).map((_, i) => (
                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-green-50 text-green-700 border border-green-100">
                          {{1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉"}[i+1] || (i+1)}
                        </span>
                      ))}
                      {t.headerParamCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-700 border border-purple-100">
                          H{{1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉"}[t.headerParamCount] || t.headerParamCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Template Preview and Send Form */}
        {selectedTemplate && (
          <div className="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Send Message</h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-5">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-900 mb-2">Template Preview</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTemplate.body || "(No body)"}</div>
                {selectedTemplate.headerFormat && (
                  <div className="mt-2 text-xs text-gray-500">
                    Header format: {selectedTemplate.headerFormat}
                  </div>
                )}
              </div>
              
              {/* Header Input */}
              {headerFormat && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Header Content
                    </label>
                    <span className="text-xs text-gray-500">
                      {headerFormat} {headerParamCount > 0 ? `(${headerParamCount} variable${headerParamCount !== 1 ? 's' : ''})` : ''}
                    </span>
                  </div>
                  
                  {headerFormat === "TEXT" ? (
                    <input
                      type="text"
                      value={headerText}
                      onChange={e => setHeaderText(e.target.value)}
                      placeholder={headerParamCount > 0 ? `Enter header text with ${headerParamCount} variable${headerParamCount !== 1 ? 's' : ''}` : "Enter header text"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  ) : (
                    <div className="space-y-3">
                      {/* Media ID input */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Media ID (optional)
                        </label>
                        <input
                          type="text"
                          value={mediaId}
                          onChange={e => {
                            setMediaId(e.target.value);
                            // Clear file selection when media ID is entered
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
                      
                      {/* File upload section */}
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
                              disabled={!!mediaId.trim()} // Disable file upload when media ID is provided
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
              
              {/* Body Parameters */}
              {bodyParamCount > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Body Variables
                    </label>
                    <span className="text-xs text-gray-500">
                      {personalizeWithUserData && bodyParamCount > 0 ? bodyParamCount - 1 : bodyParamCount} variable{bodyParamCount !== 1 ? 's' : ''} 
                      {personalizeWithUserData && bodyParamCount > 0 ? ' (excluding auto-filled name)' : ''}
                    </span>
                  </div>
                  
                  {/* Personalization option */}
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
              
              {/* Send Button */}
              <div className="flex items-center justify-end gap-3">
                {sendResult && (
                  <div className={`text-sm p-3 rounded-md ${
                    sendResult.status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                    sendResult.status === 'partial_success' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 
                    'text-red-700 bg-red-50 border border-red-200'
                  }`}>
                    {sendResult.status === 'success' && (
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {sendResult.message}
                      </div>
                    )}
                    {sendResult.status === 'partial_success' && (
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {sendResult.message}
                      </div>
                    )}
                    {sendResult.status !== 'success' && sendResult.status !== 'partial_success' && (
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {sendResult.message}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`px-4 py-2 rounded-md font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm ${
                    !canSend
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800'
                  }`}
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
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Templates;