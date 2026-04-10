import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

function ProtectedRoute({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Wait for Firebase to resolve the initial auth state before rendering route decisions.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const authStatus = !!user;
      setIsAuthenticated(authStatus);
      setIsLoading(false);
    });

    return () => unsubscribe();
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
