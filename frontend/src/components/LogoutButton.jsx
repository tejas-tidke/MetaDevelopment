import React from "react";
import { logout } from "../services/authService";
import AppButton from "./ui/AppButton";

function LogoutButton({ className, onLogout, variant = "danger", size = "md", icon }) {
  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AppButton
      onClick={handleLogout}
      className={className}
      variant={variant}
      size={size}
      icon={icon}
    >
      Logout
    </AppButton>
  );
}

export default LogoutButton;
