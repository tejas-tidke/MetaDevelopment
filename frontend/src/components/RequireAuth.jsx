import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthGateLoading() {
  return (
    <div className="auth-gate-loading">
      <div className="auth-gate-spinner" />
      <p>Checking your session...</p>
    </div>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthGateLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}

export default RequireAuth;
