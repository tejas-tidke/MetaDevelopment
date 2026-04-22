import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import StatusBadge from "../../components/ui/StatusBadge";

function ContactImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const uploadWithPreference = async (keepDuplicates) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const response = await api.post("/upload", formData, {
        params: { keepDuplicates },
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedFile = response?.data?.file;
      if (!uploadedFile?.id) {
        throw new Error("File upload succeeded but no file id was returned.");
      }

      const params = new URLSearchParams({
        processed: String(uploadedFile.processedRecords || 0),
        errors: String(uploadedFile.errorRecords || 0),
      });
      navigate(`/app/contacts/imports/${uploadedFile.id}?${params.toString()}`);
    } catch (error) {
      console.error("Import failed", error);
      setMessage(error?.response?.data?.message || "Failed to upload file.");
      setTone("error");
    } finally {
      setUploading(false);
      setDuplicateInfo(null);
    }
  };

  const checkDuplicatesAndUpload = async () => {
    if (!file) {
      setMessage("Select a CSV or Excel file first.");
      setTone("error");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setMessage("Checking duplicates...");
    setTone("info");
    try {
      const duplicateCheck = await api.post("/upload/check-duplicates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const total = Number(duplicateCheck?.data?.totalDuplicates || 0);
      if (duplicateCheck?.data?.status === "duplicates_found" && total > 0) {
        setDuplicateInfo(duplicateCheck.data);
        setMessage(`Found ${total} duplicate contacts in this file.`);
        setTone("warning");
        return;
      }
      await uploadWithPreference(false);
    } catch (error) {
      console.error("Duplicate check failed", error);
      setMessage(error?.response?.data?.message || "Could not validate duplicates.");
      setTone("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-page">
      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Import Contacts</h2>
            <p>Upload a CSV/XLSX file. Imported contacts become available for campaigns.</p>
          </div>
        </div>
        <div className="app-section-body">
          <div className="app-field" style={{ maxWidth: "480px" }}>
            <label htmlFor="contacts-file">Choose file</label>
            <input
              id="contacts-file"
              type="file"
              className="app-input"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file && <p style={{ margin: 0, color: "#64748b", fontSize: "0.76rem" }}>Selected: {file.name}</p>}
          </div>

          {message && (
            <div style={{ marginTop: "0.75rem" }}>
              <StatusBadge tone={tone}>{message}</StatusBadge>
            </div>
          )}

          {duplicateInfo && (
            <div className="app-empty" style={{ marginTop: "0.85rem", textAlign: "left" }}>
              Duplicate contacts found: {duplicateInfo.totalDuplicates}
              <div style={{ marginTop: "0.55rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="app-btn-secondary" onClick={() => uploadWithPreference(false)}>
                  Skip Duplicates
                </button>
                <button type="button" className="app-btn-primary" onClick={() => uploadWithPreference(true)}>
                  Keep Duplicates
                </button>
              </div>
            </div>
          )}

          <div className="app-inline-actions">
            <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/contacts")}>
              Back to Contacts
            </button>
            <button type="button" className="app-btn-primary" onClick={checkDuplicatesAndUpload} disabled={uploading}>
              {uploading ? "Processing..." : "Upload File"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ContactImportPage;

