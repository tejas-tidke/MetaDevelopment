import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import { deleteCampaign, listCampaigns } from "../../services/campaignService";

function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);

  const loadCampaigns = () => {
    setCampaigns(listCampaigns());
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleDelete = (event, campaignId) => {
    event.stopPropagation();
    deleteCampaign(campaignId);
    loadCampaigns();
  };

  return (
    <div className="app-page">
      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Campaigns</h2>
            <p>Create and monitor message campaigns from one place.</p>
          </div>
          <button
            type="button"
            className="app-btn-primary"
            onClick={() => navigate("/app/campaigns/new/details")}
          >
            New Campaign
          </button>
        </div>
        <div className="app-section-body">
          {campaigns.length === 0 ? (
            <EmptyState>There are no campaigns yet. Start by creating a new campaign.</EmptyState>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Template</th>
                    <th>Recipients</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} onClick={() => navigate(`/app/campaigns/${campaign.id}`)} style={{ cursor: "pointer" }}>
                      <td>{campaign.name || "Untitled Campaign"}</td>
                      <td>
                        <StatusBadge value={campaign.status || "draft"} />
                      </td>
                      <td>{campaign.templateName || "-"}</td>
                      <td>{campaign.recipientCount || 0}</td>
                      <td>{new Date(campaign.updatedAt || campaign.createdAt).toLocaleString()}</td>
                      <td>
                        <button
                          type="button"
                          className="app-btn-danger"
                          onClick={(event) => handleDelete(event, campaign.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default CampaignsPage;

