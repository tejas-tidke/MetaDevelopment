import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaignDraft } from "../../context/CampaignDraftContext";
import CampaignWizardLayout from "./CampaignWizardLayout";

function CampaignDetailsStepPage() {
  const navigate = useNavigate();
  const { draft, updateDraftSection } = useCampaignDraft();
  const [error, setError] = useState("");
  const details = draft.details;

  const onChange = (event) => {
    const { name, value } = event.target;
    updateDraftSection("details", { [name]: value });
  };

  const handleContinue = () => {
    if (!details.campaignName.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (!details.objective.trim()) {
      setError("Campaign objective is required.");
      return;
    }
    if (details.scheduleType === "later" && !details.scheduledAt) {
      setError("Please set a schedule time.");
      return;
    }
    setError("");
    navigate("/app/campaigns/new/audience");
  };

  return (
    <CampaignWizardLayout
      activeStep="details"
      title="Campaign Details"
      subtitle="Set campaign basics before selecting audience and template."
    >
      <div className="app-field-grid">
        <div className="app-field">
          <label htmlFor="campaignName">Campaign Name</label>
          <input
            id="campaignName"
            name="campaignName"
            className="app-input"
            value={details.campaignName}
            onChange={onChange}
            placeholder="Q2 Promo - Existing Customers"
          />
        </div>

        <div className="app-field">
          <label htmlFor="channel">Channel</label>
          <select id="channel" name="channel" className="app-select" value={details.channel} onChange={onChange}>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        <div className="app-field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="objective">Objective</label>
          <textarea
            id="objective"
            name="objective"
            className="app-textarea"
            value={details.objective}
            onChange={onChange}
            placeholder="Announce an offer, collect responses, or share updates."
          />
        </div>

        <div className="app-field">
          <label htmlFor="scheduleType">When to send</label>
          <select
            id="scheduleType"
            name="scheduleType"
            className="app-select"
            value={details.scheduleType}
            onChange={onChange}
          >
            <option value="now">Send immediately after review</option>
            <option value="later">Schedule for later</option>
          </select>
        </div>

        {details.scheduleType === "later" && (
          <div className="app-field">
            <label htmlFor="scheduledAt">Schedule Date & Time</label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              className="app-input"
              value={details.scheduledAt}
              onChange={onChange}
            />
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: "0.75rem", marginBottom: 0 }}>{error}</p>
      )}

      <div className="app-inline-actions">
        <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/campaigns")}>
          Cancel
        </button>
        <button type="button" className="app-btn-primary" onClick={handleContinue}>
          Continue to Audience
        </button>
      </div>
    </CampaignWizardLayout>
  );
}

export default CampaignDetailsStepPage;

