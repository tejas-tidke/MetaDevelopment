import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { checkAuthAndRedirect } from "../services/authService";

function ProtectedRoute({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status immediately
    const checkAuth = () => {
      const user = auth.currentUser;
      const authStatus = !!user;
      setIsAuthenticated(authStatus);
      setIsLoading(false);
      
      // If not authenticated, redirect to login
      if (!authStatus) {
        checkAuthAndRedirect();
      }
    };

    // Initial check
    checkAuth();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const authStatus = !!user;
      setIsAuthenticated(authStatus);
      setIsLoading(false);
      
      // If not authenticated, redirect to login
      if (!authStatus) {
        checkAuthAndRedirect();
      }
    });

    // Handle browser navigation events
    const handlePopState = () => {
      // Re-check authentication when browser navigation occurs
      checkAuth();
    };

    // Add event listener for browser navigation
    window.addEventListener('popstate', handlePopState);

    // Cleanup subscriptions and event listeners
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    // If not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated, render the requested component
  return children;
}

export default ProtectedRoute;