import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { listCampaigns } from "../../services/campaignService";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";

function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    contacts: 0,
    files: 0,
    templates: 0,
    campaigns: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [contactsRes, filesRes, templatesRes] = await Promise.all([
          api.get("/user-details").catch(() => null),
          api.get("/files").catch(() => null),
          api.get("/waba/templates").catch(() => null),
        ]);

        const contactsData = contactsRes?.data?.data || [];
        const filesData = Array.isArray(filesRes?.data?.data)
          ? filesRes.data.data
          : Array.isArray(filesRes?.data)
            ? filesRes.data
            : [];
        const templateData = templatesRes?.data?.data || [];
        const campaigns = listCampaigns();

        setStats({
          contacts: contactsData.length,
          files: filesData.length,
          templates: templateData.length,
          campaigns: campaigns.length,
        });
        setRecentCampaigns(campaigns.slice(0, 5));
      } catch (error) {
        console.error("Failed to load dashboard", error);
      }
    };

    loadDashboard();
  }, []);

  const cards = useMemo(
    () => [
      { label: "Total Campaigns", value: stats.campaigns, tone: "info" },
      { label: "Active Contacts", value: stats.contacts, tone: "success" },
      { label: "Imported Files", value: stats.files, tone: "warning" },
      { label: "Templates", value: stats.templates, tone: "info" },
    ],
    [stats]
  );

  return (
    <div className="app-page">
      <section className="app-grid-4">
        {cards.map((card) => (
          <article key={card.label} className="app-stat">
            <p className="app-stat-label">{card.label}</p>
            <p className="app-stat-value">{card.value}</p>
            <StatusBadge tone={card.tone}>{card.label.split(" ")[0]}</StatusBadge>
          </article>
        ))}
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Start With Campaigns</h2>
            <p>Primary workflow: Campaign → Audience → Template → Review → Send</p>
          </div>
          <button
            type="button"
            className="app-btn-primary"
            onClick={() => navigate("/app/campaigns/new/details")}
          >
            Create Campaign
          </button>
        </div>
        <div className="app-section-body app-grid-3">
          <article className="app-stat">
            <p className="app-stat-label">Step 1</p>
            <p className="app-stat-value" style={{ fontSize: "1rem" }}>
              Define campaign details
            </p>
          </article>
          <article className="app-stat">
            <p className="app-stat-label">Step 2</p>
            <p className="app-stat-value" style={{ fontSize: "1rem" }}>
              Select target audience
            </p>
          </article>
          <article className="app-stat">
            <p className="app-stat-label">Step 3-5</p>
            <p className="app-stat-value" style={{ fontSize: "1rem" }}>
              Choose template, review, send
            </p>
          </article>
        </div>
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Recent Campaigns</h2>
            <p>Latest campaign activity in this workspace</p>
          </div>
          <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/campaigns")}>
            View All
          </button>
        </div>
        <div className="app-section-body">
          {recentCampaigns.length === 0 ? (
            <EmptyState>No campaigns yet. Create your first campaign to start sending.</EmptyState>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Audience</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      onClick={() => navigate(`/app/campaigns/${campaign.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{campaign.name || "Untitled Campaign"}</td>
                      <td>
                        <StatusBadge value={campaign.status || "draft"} />
                      </td>
                      <td>{campaign.recipientCount || 0}</td>
                      <td>{new Date(campaign.updatedAt || campaign.createdAt).toLocaleString()}</td>
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

export default DashboardPage;

