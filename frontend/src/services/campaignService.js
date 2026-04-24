import { auth } from "../firebase";
import { getCurrentUser } from "./authService";

const CAMPAIGNS_STORAGE_KEY_PREFIX = "app.campaigns.v2";
const CAMPAIGN_PENDING_TOAST_KEY_PREFIX = "app.campaign.pending-toast.v2";

function getActiveUserUid() {
  const firebaseUid = (auth?.currentUser?.uid || "").toString().trim();
  const storedUid = (getCurrentUser()?.uid || "").toString().trim();
  return firebaseUid || storedUid || "anonymous";
}

function campaignsStorageKey() {
  return `${CAMPAIGNS_STORAGE_KEY_PREFIX}:${getActiveUserUid()}`;
}

function pendingToastStorageKey() {
  return `${CAMPAIGN_PENDING_TOAST_KEY_PREFIX}:${getActiveUserUid()}`;
}

function readCampaigns() {
  try {
    const raw = localStorage.getItem(campaignsStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse campaigns from localStorage", error);
    return [];
  }
}

function writeCampaigns(campaigns) {
  localStorage.setItem(campaignsStorageKey(), JSON.stringify(campaigns));
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

export function setPendingCampaignToast(campaignId, toast) {
  try {
    if (!campaignId || !toast) return;
    const payload = {
      campaignId: String(campaignId),
      tone: toast.tone || "success",
      title: toast.title || "Campaign Updated",
      message: toast.message || "",
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem(pendingToastStorageKey(), JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to set pending campaign toast", error);
  }
}

export function consumePendingCampaignToast(campaignId) {
  try {
    const raw = sessionStorage.getItem(pendingToastStorageKey());
    if (!raw) return null;

    sessionStorage.removeItem(pendingToastStorageKey());
    const parsed = JSON.parse(raw);
    if (!parsed || String(parsed.campaignId) !== String(campaignId)) {
      return null;
    }

    return {
      tone: parsed.tone || "success",
      title: parsed.title || "Campaign Updated",
      message: parsed.message || "",
    };
  } catch (error) {
    console.error("Failed to consume pending campaign toast", error);
    return null;
  }
}

export function generateCampaignId() {
  return `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

