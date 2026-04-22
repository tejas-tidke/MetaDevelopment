import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import RequireAuth from "./components/RequireAuth";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import AppShell from "./components/layout/AppShell";
import { AuthProvider } from "./context/AuthContext";
import { CampaignDraftProvider } from "./context/CampaignDraftContext";
import DashboardPage from "./pages/dashboard/DashboardPage";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import CampaignDetailsStepPage from "./pages/campaigns/CampaignDetailsStepPage";
import CampaignAudienceStepPage from "./pages/campaigns/CampaignAudienceStepPage";
import CampaignTemplateStepPage from "./pages/campaigns/CampaignTemplateStepPage";
import CampaignReviewStepPage from "./pages/campaigns/CampaignReviewStepPage";
import CampaignDetailPage from "./pages/campaigns/CampaignDetailPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import ContactImportPage from "./pages/contacts/ContactImportPage";
import ImportDetailPage from "./pages/contacts/ImportDetailPage";
import TemplatesPage from "./pages/templates/TemplatesPage";
import ConversationsPage from "./pages/conversations/ConversationsPage";
import SettingsProfilePage from "./pages/settings/SettingsProfilePage";
import "./App.css";
import "./styles/auth.css";
import "./styles/workspace.css";
import "./styles/app-shell.css";

function LegacyRedirect({ to, includeState = true }) {
  const location = useLocation();
  return <Navigate to={to} replace state={includeState ? location.state : undefined} />;
}

function LegacyUploadedDataRedirect() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const state = location.state || {};
  const fileId = state.fileId || query.get("fileId");

  if (!fileId) {
    return <Navigate to="/app/contacts" replace />;
  }

  const params = new URLSearchParams();
  if (state.processedRecords != null) params.set("processed", String(state.processedRecords));
  if (state.errorRecords != null) params.set("errors", String(state.errorRecords));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return <Navigate to={`/app/contacts/imports/${fileId}${suffix}`} replace />;
}

function ProtectedShellRoutes() {
  return (
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth/login" replace />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
      </Route>

      <Route path="/app" element={<ProtectedShellRoutes />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="campaigns">
          <Route index element={<CampaignsPage />} />
          <Route path="new/details" element={<CampaignDetailsStepPage />} />
          <Route path="new/audience" element={<CampaignAudienceStepPage />} />
          <Route path="new/template" element={<CampaignTemplateStepPage />} />
          <Route path="new/review" element={<CampaignReviewStepPage />} />
          <Route path=":campaignId" element={<CampaignDetailPage />} />
        </Route>

        <Route path="contacts">
          <Route index element={<ContactsPage />} />
          <Route path="import" element={<ContactImportPage />} />
          <Route path="imports/:fileId" element={<ImportDetailPage />} />
        </Route>

        <Route path="templates" element={<TemplatesPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="settings/profile" element={<SettingsProfilePage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/welcome" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/templates" element={<LegacyRedirect to="/app/templates" />} />
        <Route path="/flows" element={<LegacyRedirect to="/app/campaigns" />} />
        <Route path="/conversations" element={<LegacyRedirect to="/app/conversations" />} />
        <Route path="/existing-list" element={<LegacyRedirect to="/app/contacts" />} />
        <Route path="/file-upload" element={<LegacyRedirect to="/app/contacts/import" />} />
        <Route path="/profile" element={<LegacyRedirect to="/app/settings/profile" />} />
        <Route path="/uploaded-data" element={<LegacyUploadedDataRedirect />} />
        <Route path="/uploaded-data-select" element={<LegacyUploadedDataRedirect />} />
      </Route>

      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <CampaignDraftProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </CampaignDraftProvider>
    </AuthProvider>
  );
}

export default App;
