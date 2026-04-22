const CAMPAIGNS_STORAGE_KEY = "app.campaigns.v1";

function readCampaigns() {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse campaigns from localStorage", error);
    return [];
  }
}

function writeCampaigns(campaigns) {
  localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
}

export function listCampaigns() {
  return readCampaigns().sort((a, b) => {
    const left = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const right = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return left - right;
  });
}

export function getCampaignById(campaignId) {
  return readCampaigns().find((campaign) => campaign.id === campaignId) || null;
}

export function upsertCampaign(campaign) {
  const campaigns = readCampaigns();
  const existingIndex = campaigns.findIndex((item) => item.id === campaign.id);
  const nextCampaign = {
    ...campaign,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    campaigns[existingIndex] = {
      ...campaigns[existingIndex],
      ...nextCampaign,
    };
  } else {
    campaigns.push({
      createdAt: new Date().toISOString(),
      ...nextCampaign,
    });
  }

  writeCampaigns(campaigns);
  return nextCampaign;
}

export function deleteCampaign(campaignId) {
  const filtered = readCampaigns().filter((campaign) => campaign.id !== campaignId);
  writeCampaigns(filtered);
}

export function generateCampaignId() {
  return `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

