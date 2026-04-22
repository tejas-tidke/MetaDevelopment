import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Custom hook to protect routes from unauthorized access
export const useAuthProtection = (redirectTo = "/auth/login") => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return null;
};

// Custom hook to redirect authenticated users away from public pages
export const useRedirectIfAuthenticated = (redirectTo = "/app/dashboard") => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return isLoading;
};
