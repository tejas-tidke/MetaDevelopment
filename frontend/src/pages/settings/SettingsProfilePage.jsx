import React, { useState } from "react";
import { auth } from "../../firebase";
import SensitiveActionModal from "../../components/SensitiveActionModal";
import { logout } from "../../services/authService";
import StatusBadge from "../../components/ui/StatusBadge";

function SettingsProfilePage() {
  const user = auth.currentUser;
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("success");

  const openActionModal = (action) => {
    setModalAction(action);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    if (modalAction === "deleteAccount") {
      setTone("warning");
      setMessage("Account deleted. Redirecting to login.");
      setTimeout(() => logout(), 800);
      return;
    }
    setTone("success");
    setMessage(modalAction === "changeEmail" ? "Email updated successfully." : "Password updated successfully.");
  };

  return (
    <>
      <div className="app-page">
        <section className="app-section-card">
          <div className="app-section-head">
            <div>
              <h2>Profile</h2>
              <p>Manage your account details and security actions.</p>
            </div>
          </div>
          <div className="app-section-body">
            <div className="app-field-grid">
              <div className="app-field">
                <label>Email</label>
                <input className="app-input" value={user?.email || "-"} readOnly />
              </div>
              <div className="app-field">
                <label>Display Name</label>
                <input className="app-input" value={user?.displayName || "-"} readOnly />
              </div>
            </div>
            {message && (
              <div style={{ marginTop: "0.8rem" }}>
                <StatusBadge tone={tone}>{message}</StatusBadge>
              </div>
            )}
          </div>
        </section>

        <section className="app-section-card">
          <div className="app-section-head">
            <div>
              <h2>Security</h2>
              <p>Re-authentication is required for sensitive operations.</p>
            </div>
          </div>
          <div className="app-section-body">
            <div className="app-inline-actions">
              <button type="button" className="app-btn-secondary" onClick={() => openActionModal("changePassword")}>
                Change Password
              </button>
              <button type="button" className="app-btn-secondary" onClick={() => openActionModal("changeEmail")}>
                Change Email
              </button>
              <button type="button" className="app-btn-danger" onClick={() => openActionModal("deleteAccount")}>
                Delete Account
              </button>
              <button type="button" className="app-btn-primary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </section>
      </div>

      <SensitiveActionModal
        actionType={modalAction}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}

export default SettingsProfilePage;

