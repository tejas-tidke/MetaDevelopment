import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from './components/Login';
import Signup from './components/Signup';
import Welcome from './components/Welcome';
import Templates from './components/Templates';
import Conversations from './components/Conversations';
import ExistingList from './components/ExistingList';
import FileUpload from './components/FileUpload';
import UserProfile from './components/UserProfile';
import UploadedData from './components/UploadedData';
import UploadedDataSelect from './components/UploadedDataSelect';
import ProtectedRoute from './components/ProtectedRoute';
import { initAuthListener } from './services/authService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import "./App.css";
import "./styles/auth.css";
import "./styles/workspace.css";

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="app-route-full">
      <div
        key={`${location.pathname}${location.search}${location.hash}`}
        className="route-transition-stage"
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Login />} />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flows"
            element={
              <ProtectedRoute>
                <Navigate to="/templates" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/conversations"
            element={
              <ProtectedRoute>
                <Conversations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/existing-list"
            element={
              <ProtectedRoute>
                <ExistingList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/file-upload"
            element={
              <ProtectedRoute>
                <FileUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/uploaded-data"
            element={
              <ProtectedRoute>
                <UploadedData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/uploaded-data-select"
            element={
              <ProtectedRoute>
                <UploadedDataSelect />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Initialize Firebase auth listener
    initAuthListener();
    
    // Handle browser navigation events
    const handlePopState = () => {
      // Check authentication state when user navigates with browser buttons
      onAuthStateChanged(auth, (user) => {
        const isAuthenticated = !!user;
        const currentPath = window.location.pathname;
        const isProtectedRoute = !['/login', '/signup', '/'].includes(currentPath);
        
        // If user is not authenticated and trying to access a protected route
        if (!isAuthenticated && isProtectedRoute) {
          // Redirect to login and replace history to prevent back navigation
          window.location.replace('/login');
        }
      });
    };
    
    // Add event listener for browser navigation (back/forward buttons)
    window.addEventListener('popstate', handlePopState);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;
