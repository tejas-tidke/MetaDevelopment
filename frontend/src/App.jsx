import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Welcome from './components/Welcome';
import Templates from './components/Templates';
import ExistingList from './components/ExistingList';
import FileUpload from './components/FileUpload';
import UserProfile from './components/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import { initAuthListener } from './services/authService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './App.css';

function App() {
  useEffect(() => {
    // Initialize Firebase auth listener
    initAuthListener();
    
    // Handle browser navigation events
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When the tab becomes visible, check auth state
        onAuthStateChanged(auth, (user) => {
          if (!user && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
            // If user is not authenticated and not on login/signup page, redirect to login
            window.location.href = '/login';
          }
        });
      }
    };
    
    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <div className="container mx-auto p-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Login />} />
            <Route path="/welcome" element={
              <ProtectedRoute>
                <Welcome />
              </ProtectedRoute>
            } />
            <Route path="/templates" element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            } />
            <Route path="/existing-list" element={
              <ProtectedRoute>
                <ExistingList />
              </ProtectedRoute>
            } />
            <Route path="/file-upload" element={
              <ProtectedRoute>
                <FileUpload />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;