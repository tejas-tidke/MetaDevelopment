import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthProtection } from '../hooks/useAuthProtection';
import SensitiveActionModal from './SensitiveActionModal';
import LogoutButton from './LogoutButton';

function UserProfile() {
  const navigate = useNavigate();
  
  // Protect this component from unauthorized access
  useAuthProtection();

  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState("");
  const [message, setMessage] = useState("");
  
  const user = auth.currentUser;
  
  const handleSensitiveAction = (actionType) => {
    setModalAction(actionType);
    setShowModal(true);
  };
  
  const handleActionSuccess = () => {
    if (modalAction === "deleteAccount") {
      // User has been deleted, redirect to login
      navigate("/login");
    } else if (modalAction === "changeEmail") {
      setMessage("Email updated successfully");
    } else if (modalAction === "changePassword") {
      setMessage("Password updated successfully");
    }
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-blue-600 to-indigo-700">
            <h1 className="text-2xl font-bold text-white">User Profile</h1>
            <p className="mt-1 text-blue-100">Manage your account settings and security</p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.includes("success") || message.includes("sent") 
                  ? "bg-green-50 text-green-700 border border-green-200" 
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {message}
              </div>
            )}
            
            {/* User Information */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.email || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{user?.displayName || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Security Actions */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Security</h2>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Change Password</h3>
                    <p className="mt-1 text-sm text-gray-500">Update your password regularly for better security</p>
                  </div>
                  <button
                    onClick={() => handleSensitiveAction("changePassword")}
                    className="mt-2 sm:mt-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Change
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Change Email</h3>
                    <p className="mt-1 text-sm text-gray-500">Update your email address</p>
                  </div>
                  <button
                    onClick={() => handleSensitiveAction("changeEmail")}
                    className="mt-2 sm:mt-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Change
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
                    <p className="mt-1 text-sm text-gray-500">Permanently delete your account and all data</p>
                  </div>
                  <button
                    onClick={() => handleSensitiveAction("deleteAccount")}
                    className="mt-2 sm:mt-0 px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            
            {/* Session Management */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Session Management</h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Logout</h3>
                  <p className="mt-1 text-sm text-gray-500">Sign out from this device</p>
                </div>
                <LogoutButton 
                  className="mt-2 sm:mt-0 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onLogout={() => navigate("/login")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sensitive Action Modal */}
      <SensitiveActionModal
        actionType={modalAction}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleActionSuccess}
      />
    </div>
  );
}

export default UserProfile;