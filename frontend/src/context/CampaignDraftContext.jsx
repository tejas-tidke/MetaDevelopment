/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState } from "react";

const CampaignDraftContext = createContext(null);

function createDefaultDraft() {
  return {
    details: {
      campaignName: "",
      objective: "",
      channel: "whatsapp",
      scheduleType: "now",
      scheduledAt: "",
    },
    audience: {
      mode: "all_contacts",
      fileId: "",
      selectedContactIds: [],
      estimatedRecipients: 0,
    },
    template: {
      templateName: "",
      language: "en_US",
      personalizeWithUserData: true,
      bodyParams: [],
      bodyParamCount: 0,
      headerFormat: "",
      headerParamCount: 0,
      headerText: "",
      mediaId: "",
      headerMediaFile: null,
      headerMediaFilename: "",
      templateButtons: [],
      buttonParamInputs: {},
      flowButtonTokens: {},
    },
  };
}

export function CampaignDraftProvider({ children }) {
  const [draft, setDraft] = useState(createDefaultDraft);

  const updateDraftSection = (section, patch) => {
    setDraft((previous) => ({
      ...previous,
      [section]: {
        ...(previous[section] || {}),
        ...(patch || {}),
      },
    }));
  };

  const resetDraft = () => {
    setDraft(createDefaultDraft());
  };

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      updateDraftSection,
      resetDraft,
    }),
    [draft]
  );

  return <CampaignDraftContext.Provider value={value}>{children}</CampaignDraftContext.Provider>;
}

export function useCampaignDraft() {
  const context = useContext(CampaignDraftContext);
  if (!context) {
    throw new Error("useCampaignDraft must be used inside CampaignDraftProvider.");
  }
  return context;
}
