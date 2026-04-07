import React, { useState } from "react";
import { reauthenticate, deleteAccount, updateUserEmail, updateUserPassword } from "../services/authService";

function SensitiveActionModal({ 
  actionType, 
  isOpen, 
  onClose, 
  onSuccess
}) {
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getTitle = () => {
    switch (actionType) {
      case "deleteAccount": return "Delete Account";
      case "changeEmail": return "Change Email";
      case "changePassword": return "Change Password";
      default: return "Confirm Action";
    }
  };

  const getDescription = () => {
    switch (actionType) {
      case "deleteAccount": 
        return "Please enter your password to confirm account deletion. This action cannot be undone.";
      case "changeEmail": 
        return "Please enter your password to confirm email change.";
      case "changePassword": 
        return "Please enter your current password and new password.";
      default: 
        return "Please enter your password to confirm this action.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (!password) {
      setMessage("Please enter your password");
      return;
    }

    if (actionType === "changeEmail" && !newEmail) {
      setMessage("Please enter a new email address");
      return;
    }

    if (actionType === "changePassword") {
      if (!newPassword) {
        setMessage("Please enter a new password");
        return;
      }
      if (newPassword !== confirmPassword) {
        setMessage("Passwords do not match");
        return;
      }
      if (newPassword.length < 6) {
        setMessage("Password must be at least 6 characters");
        return;
      }
    }

    setIsLoading(true);
    
    try {
      switch (actionType) {
        case "deleteAccount":
          await deleteAccount(password);
          setMessage("Account deleted successfully");
          setTimeout(() => {
            onSuccess && onSuccess();
            onClose();
          }, 1500);
          break;
          
        case "changeEmail":
          await updateUserEmail(newEmail, password);
          setMessage("Email updated successfully");
          setTimeout(() => {
            onSuccess && onSuccess(newEmail);
            onClose();
          }, 1500);
          break;
          
        case "changePassword":
          await updateUserPassword(newPassword, password);
          setMessage("Password updated successfully");
          setTimeout(() => {
            onSuccess && onSuccess();
            onClose();
          }, 1500);
          break;
          
        default:
          // Just re-authenticate for other actions
          await reauthenticate(password);
          setMessage("Authentication successful");
          setTimeout(() => {
            onSuccess && onSuccess();
            onClose();
          }, 1500);
      }
    } catch (error) {
      console.error("Sensitive action error:", error);
      let errorMsg = "Action failed. Please try again.";
      if (error.code === "auth/wrong-password") {
        errorMsg = "Incorrect password. Please try again.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMsg = "Email is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Invalid email address.";
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-backdrop">
      <div className="auth-modal">
        <div>
          <div className="auth-modal-head">
            <h3>{getTitle()}</h3>
            <button
              onClick={onClose}
              className="auth-modal-close"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">{getDescription()}</p>
          
          <form onSubmit={handleSubmit}>
            {/* Password field */}
            <div className="mb-4">
              <label className="auth-label">
                Current Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (message) setMessage("");
                }}
                className="auth-input"
                placeholder="Enter your current password"
              />
            </div>
            
            {/* New email field (for email change) */}
            {actionType === "changeEmail" && (
              <div className="mb-4">
                <label className="auth-label">
                  New Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (message) setMessage("");
                  }}
                  className="auth-input"
                  placeholder="Enter new email address"
                />
              </div>
            )}
            
            {/* New password fields (for password change) */}
            {actionType === "changePassword" && (
              <>
                <div className="mb-4">
                  <label className="auth-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (message) setMessage("");
                    }}
                    className="auth-input"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="auth-label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (message) setMessage("");
                    }}
                    className="auth-input"
                    placeholder="Confirm new password"
                  />
                </div>
              </>
            )}
            
            {message && (
              <div className={`mb-4 auth-alert ${message.includes("success") ? "success" : "error"}`}>
                {message}
              </div>
            )}
            
            <div className="auth-modal-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="auth-btn-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="auth-btn-primary"
              >
                {isLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SensitiveActionModal;
