import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useCampaignDraft } from "../../context/CampaignDraftContext";
import CampaignWizardLayout from "./CampaignWizardLayout";
import StatusBadge from "../../components/ui/StatusBadge";

function getContactKey(contact) {
  if (contact?.id != null) {
    return `id:${contact.id}`;
  }
  const email = (contact?.email || "").toString().trim().toLowerCase();
  const phone = (contact?.phoneNo || contact?.phone || "").toString().trim();
  const name = (contact?.name || "").toString().trim().toLowerCase();
  return `fp:${email}|${phone}|${name}`;
}

function hasPhoneNumber(contact) {
  return Boolean((contact?.phoneNo || contact?.phone || "").toString().trim());
}

function CampaignAudienceStepPage() {
  const navigate = useNavigate();
  const { draft, updateDraftSection } = useCampaignDraft();
  const [contacts, setContacts] = useState([]);
  const [contactsCount, setContactsCount] = useState(0);
  const [contactSearch, setContactSearch] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState("");
  const audience = draft.audience;
  const usingUploadedAudience = audience.mode === "upload_file" || audience.mode === "uploaded_file";
  const selectedContactIds = Array.isArray(audience.selectedContactIds) ? audience.selectedContactIds : [];
  const selectedContactIdSet = new Set(selectedContactIds);

  useEffect(() => {
    if (!draft.details.campaignName.trim()) {
      navigate("/app/campaigns/new/details", { replace: true });
    }
  }, [draft.details.campaignName, navigate]);

  useEffect(() => {
    const loadAudienceData = async () => {
      try {
        const contactsRes = await api.get("/user-details");
        const contacts = Array.isArray(contactsRes?.data?.data) ? contactsRes.data.data : [];
        setContactsCount(contacts.length);
        setContacts(contacts);
      } catch (fetchError) {
        console.error("Failed to load audience data", fetchError);
      }
    };
    loadAudienceData();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    if (!contactSearch.trim()) return true;
    const query = contactSearch.toLowerCase();
    return [contact?.name, contact?.email, contact?.phoneNo, contact?.phone, contact?.companyName]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(query));
  });

  const allFilteredSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((contact) => selectedContactIdSet.has(getContactKey(contact)));

  const resolveEstimatedRecipients = () => {
    if (audience.mode === "all_contacts") {
      return contacts.filter(
        (contact) => selectedContactIdSet.has(getContactKey(contact)) && hasPhoneNumber(contact)
      ).length;
    }
    if (usingUploadedAudience) {
      return audience.estimatedRecipients || 0;
    }
    return 0;
  };

  const toggleContactSelection = (contact) => {
    const key = getContactKey(contact);
    const nextSelected = new Set(selectedContactIds);
    if (nextSelected.has(key)) {
      nextSelected.delete(key);
    } else {
      nextSelected.add(key);
    }
    updateDraftSection("audience", {
      selectedContactIds: Array.from(nextSelected),
    });
  };

  const toggleAllFilteredContacts = () => {
    const nextSelected = new Set(selectedContactIds);
    if (allFilteredSelected) {
      filteredContacts.forEach((contact) => nextSelected.delete(getContactKey(contact)));
    } else {
      filteredContacts.forEach((contact) => nextSelected.add(getContactKey(contact)));
    }
    updateDraftSection("audience", {
      selectedContactIds: Array.from(nextSelected),
    });
  };

  const handleUploadAudienceFile = async () => {
    if (!fileToUpload) {
      setError("Select a CSV/XLS/XLSX file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      setIsUploading(true);
      setError("");
      setUploadStatus({ tone: "info", text: "Uploading audience file..." });

      const response = await api.post("/upload", formData, {
        params: { keepDuplicates: true },
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadedFile = response?.data?.file;
      if (!uploadedFile?.id) {
        throw new Error("Upload succeeded but file id was not returned.");
      }

      const processedRecords = Number(uploadedFile.processedRecords || 0);
      const errorRecords = Number(uploadedFile.errorRecords || 0);

      updateDraftSection("audience", {
        mode: "upload_file",
        fileId: String(uploadedFile.id),
        estimatedRecipients: processedRecords,
        selectedContactIds: [],
      });

      setUploadStatus({
        tone: errorRecords > 0 ? "warning" : "success",
        text: `File uploaded (${processedRecords} valid, ${errorRecords} skipped).`,
      });
    } catch (uploadError) {
      console.error("Audience upload failed", uploadError);
      setUploadStatus({
        tone: "error",
        text: uploadError?.response?.data?.message || "Failed to upload audience file.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = () => {
    if (audience.mode === "all_contacts" && selectedContactIds.length === 0) {
      setError("Select at least one contact from the list.");
      return;
    }
    if (audience.mode === "all_contacts" && resolveEstimatedRecipients() === 0) {
      setError("Selected contacts do not have valid phone numbers.");
      return;
    }
    if (usingUploadedAudience && !audience.fileId) {
      setError("Upload a file for this audience mode.");
      return;
    }

    updateDraftSection("audience", {
      estimatedRecipients: resolveEstimatedRecipients(),
    });
    setError("");
    navigate("/app/campaigns/new/template");
  };

  return (
    <CampaignWizardLayout
      activeStep="audience"
      title="Audience Selection"
      subtitle="Pick the recipients for this campaign."
    >
      <div className="app-field-grid">
        <div className="app-field" style={{ gridColumn: "1 / -1" }}>
          <label>Audience Source</label>
          <div className="app-inline">
            <input
              type="radio"
              id="audience-all"
              name="audienceMode"
              checked={audience.mode === "all_contacts"}
              onChange={() =>
                updateDraftSection("audience", {
                  mode: "all_contacts",
                  fileId: "",
                  selectedContactIds,
                })
              }
            />
            <label htmlFor="audience-all" style={{ margin: 0 }}>
              Contacts List ({contactsCount})
            </label>
          </div>
          <div className="app-inline">
            <input
              type="radio"
              id="audience-file"
              name="audienceMode"
              checked={usingUploadedAudience}
              onChange={() =>
                updateDraftSection("audience", {
                  mode: "upload_file",
                  fileId: "",
                  estimatedRecipients: 0,
                  selectedContactIds: [],
                })
              }
            />
            <label htmlFor="audience-file" style={{ margin: 0 }}>
              Upload New File
            </label>
          </div>
        </div>

        {audience.mode === "all_contacts" && (
          <div className="app-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="contactSearch">Choose contacts from list</label>
            <input
              id="contactSearch"
              type="text"
              className="app-input"
              placeholder="Search by name, email, phone"
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
            />
            <div className="app-inline" style={{ marginTop: "0.55rem", marginBottom: "0.55rem" }}>
              <button type="button" className="app-btn-secondary" onClick={toggleAllFilteredContacts}>
                {allFilteredSelected ? "Unselect Filtered" : "Select Filtered"}
              </button>
              <span style={{ color: "#475569", fontSize: "0.78rem" }}>
                Selected: {selectedContactIds.length}
              </span>
            </div>
            <div className="app-table-wrap" style={{ maxHeight: "280px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <table className="app-table" style={{ minWidth: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "72px" }}>Select</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#64748b" }}>
                        No contacts found for this filter.
                      </td>
                    </tr>
                  )}
                  {filteredContacts.map((contact) => {
                    const key = getContactKey(contact);
                    const checked = selectedContactIdSet.has(key);
                    return (
                      <tr key={key}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleContactSelection(contact)}
                            aria-label={`Select ${contact?.name || contact?.email || "contact"}`}
                          />
                        </td>
                        <td>{contact?.name || "-"}</td>
                        <td>{contact?.email || "-"}</td>
                        <td>{contact?.phoneNo || contact?.phone || "-"}</td>
                        <td>{contact?.companyName || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {usingUploadedAudience && (
          <div className="app-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="audienceUpload">Upload audience file</label>
            <input
              id="audienceUpload"
              type="file"
              className="app-input"
              accept=".csv,.xls,.xlsx"
              onChange={(event) => setFileToUpload(event.target.files?.[0] || null)}
            />
            <div className="app-inline" style={{ marginTop: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="app-btn-primary"
                onClick={handleUploadAudienceFile}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Upload File"}
              </button>
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => navigate("/app/contacts/import")}
              >
                Open Full Import Page
              </button>
            </div>
            {audience.fileId && (
              <p style={{ marginTop: "0.55rem", marginBottom: 0, color: "#475569", fontSize: "0.78rem" }}>
                Active audience file ID: <strong>{audience.fileId}</strong>
              </p>
            )}
            {uploadStatus && (
              <div style={{ marginTop: "0.6rem" }}>
                <StatusBadge tone={uploadStatus.tone}>{uploadStatus.text}</StatusBadge>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ marginTop: "0.75rem", marginBottom: 0, color: "#475569", fontSize: "0.8rem" }}>
        Estimated recipients: <strong>{resolveEstimatedRecipients()}</strong>
      </p>

      {error && <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>}

      <div className="app-inline-actions">
        <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/campaigns/new/details")}>
          Back
        </button>
        <button type="button" className="app-btn-primary" onClick={handleContinue}>
          Continue to Template
        </button>
      </div>
    </CampaignWizardLayout>
  );
}

export default CampaignAudienceStepPage;
