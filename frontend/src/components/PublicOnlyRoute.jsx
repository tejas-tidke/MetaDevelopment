import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
