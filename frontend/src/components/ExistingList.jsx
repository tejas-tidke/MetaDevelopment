import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuthProtection } from '../hooks/useAuthProtection';
import WorkspaceHeader from './WorkspaceHeader';
import AppButton from './ui/AppButton';
import AppCard from './ui/AppCard';
import AppAlert from './ui/AppAlert';
import PageLayout from './ui/PageLayout';

function ExistingList() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Protect this component from unauthorized access
  useAuthProtection();

  const [userDetails, setUserDetails] = useState([]);
  const [filteredDetails, setFilteredDetails] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState({ users: true, files: true });
  const [error, setError] = useState({ users: null, files: null });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUploadToast, setShowUploadToast] = useState(Boolean(location.state?.uploadSuccess));
  const [deleteToast, setDeleteToast] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const safeUploadedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [];

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, users: true }));
        const response = await api.get("user-details");
        if (response.data.status === "success") {
          setUserDetails(response.data.data || []);
          setFilteredDetails(response.data.data || []);
        } else {
          setError(prev => ({ ...prev, users: "Failed to fetch user details" }));
        }
      } catch (err) {
        setError(prev => ({ ...prev, users: "Error connecting to the server" }));
        console.error("Error fetching user details:", err);
      } finally {
        setLoading(prev => ({ ...prev, users: false }));
      }
    };

    const fetchUploadedFiles = async () => {
      try {
        setLoading(prev => ({ ...prev, files: true }));
        const response = await api.get("files");
        const files =
          Array.isArray(response.data) ? response.data :
          Array.isArray(response.data?.data) ? response.data.data :
          [];
        setUploadedFiles(files);
      } catch (err) {
        setError(prev => ({ ...prev, files: "Error fetching uploaded files" }));
        console.error("Error fetching uploaded files:", err);
        setUploadedFiles([]);
      } finally {
        setLoading(prev => ({ ...prev, files: false }));
      }
    };

    // Fetch data when component mounts or when refresh is requested
    fetchUserDetails();
    fetchUploadedFiles();
  }, []);

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDetails(userDetails);
      return;
    }

    const filtered = userDetails.filter(user => 
      Object.values(user).some(val => 
        val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredDetails(filtered);
  }, [searchTerm, userDetails]);

  // Sort data
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredDetails].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredDetails(sorted);
  };

  // Selection helpers
  const getUserKey = (user, index) => user.id ?? `${user.email ?? ''}-${user.phoneNo ?? ''}-${index}`;
  const allVisibleSelected = filteredDetails.length > 0 && filteredDetails.every((u, i) => selectedUsers.has(getUserKey(u, i)));
  const toggleSelectAll = () => {
    const next = new Set(selectedUsers);
    if (allVisibleSelected) {
      filteredDetails.forEach((u, i) => next.delete(getUserKey(u, i)));
    } else {
      filteredDetails.forEach((u, i) => next.add(getUserKey(u, i)));
    }
    setSelectedUsers(next);
  };
  const toggleOne = (user, index) => {
    const key = getUserKey(user, index);
    const next = new Set(selectedUsers);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedUsers(next);
  };
  const deletableCount = filteredDetails.reduce((acc, u, i) => acc + (selectedUsers.has(getUserKey(u, i)) && u.id != null ? 1 : 0), 0);
  const selectedCount = filteredDetails.reduce((acc, u, i) => acc + (selectedUsers.has(getUserKey(u, i)) ? 1 : 0), 0);

  const getSelectedUsersPayload = () => {
    return filteredDetails
      .map((u, i) => ({ u, i }))
      .filter(({ u, i }) => selectedUsers.has(getUserKey(u, i)))
      .map(({ u }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phoneNo: u.phoneNo,
        companyName: u.companyName,
      }));
  };

  const handleContinue = () => {
    const selected = getSelectedUsersPayload();
    navigate('/templates', { state: { selected } });
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = filteredDetails
      .map((u, i) => ({ u, i }))
      .filter(({ u, i }) => selectedUsers.has(getUserKey(u, i)) && u.id != null)
      .map(({ u }) => u.id);

    if (idsToDelete.length === 0) return;
    setPendingDeleteIds(idsToDelete);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteSelected = async () => {
    if (pendingDeleteIds.length === 0) {
      setIsDeleteConfirmOpen(false);
      return;
    }

    try {
      setIsDeleting(true);
      await api.post("user-details/delete", pendingDeleteIds);
      const idSet = new Set(pendingDeleteIds);
      setUserDetails(prev => prev.filter(u => !idSet.has(u.id)));
      setFilteredDetails(prev => prev.filter(u => !idSet.has(u.id)));
      // Clear deleted from selection
      const nextSel = new Set(selectedUsers);
      filteredDetails.forEach((u, i) => { if (idSet.has(u.id)) nextSel.delete(getUserKey(u, i)); });
      setSelectedUsers(nextSel);
      setDeleteToast({
        tone: "success",
        title: "Users Deleted",
        message: `${pendingDeleteIds.length} user${pendingDeleteIds.length === 1 ? "" : "s"} deleted successfully.`,
        key: `${Date.now()}-${pendingDeleteIds.length}`
      });
    } catch (err) {
      console.error("Delete users error:", err);
      setDeleteToast({
        tone: "error",
        title: "Delete Failed",
        message: "Failed to delete selected users. Please try again.",
        key: `${Date.now()}-delete-error`
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setPendingDeleteIds([]);
    }
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"></div>
      <p className="text-gray-600 text-sm">Loading data...</p>
    </div>
  );

  const renderError = (message) => (
    <div className="bg-red-50 border border-red-200 p-4 my-4 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-2">
          <p className="text-xs text-red-700">{message}</p>
        </div>
      </div>
    </div>
  );

  const getSortIcon = (columnName) => {
    if (sortConfig.key === columnName) {
      return sortConfig.direction === "asc" ? "^" : "v";
    }
    return "<>";
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <PageLayout shellClassName="h-full flex flex-col overflow-hidden">
        <WorkspaceHeader
          title="Data Management"
          subtitle="View and manage all user records and file uploads in one place."
          backFallback="/welcome"
          actions={
            <AppButton onClick={() => navigate('/file-upload')} variant="primary">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload New File
            </AppButton>
          }
        />

        {/* Success Message */}
        {showUploadToast && location.state?.uploadSuccess && (
          <AppAlert
            tone="success"
            title="File Uploaded Successfully"
            toastKey={`existing-list:${location.state.fileName || ""}:${location.state.processedRecords || 0}:${location.state.errorRecords || 0}`}
            onClose={() => setShowUploadToast(false)}
          >
            File "{location.state.fileName}" has been processed.
            {location.state.processedRecords > 0 && ` ${location.state.processedRecords} records imported.`}
            {location.state.errorRecords > 0 && ` ${location.state.errorRecords} records had errors.`}
          </AppAlert>
        )}

        {deleteToast && (
          <AppAlert
            tone={deleteToast.tone}
            title={deleteToast.title}
            toastKey={`existing-list:delete:${deleteToast.key}`}
            className={showUploadToast ? "bottom-20 sm:bottom-24" : ""}
            onClose={() => setDeleteToast(null)}
          >
            {deleteToast.message}
          </AppAlert>
        )}

        {/* Tabs */}
        <div className="mb-5">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab('users')}
                className={`${activeTab === 'users' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} 
                  whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                User Details
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`${activeTab === 'files' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} 
                  whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Uploaded Files
              </button>
            </nav>
          </div>
        </div>

        <div className="min-h-0 flex-1 pb-6">
        {activeTab === 'users' ? (
          <>
            {/* User Details Table */}
            <AppCard className="h-full overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">All User Details</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Complete list of all user records in the system
                  </p>
                </div>
                <div className="relative w-full md:w-52">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-7 pr-2.5 py-1.5 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting || deletableCount === 0}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                      isDeleting || deletableCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isDeleting ? 'Deleting...' : `Delete Selected${deletableCount ? ` (${deletableCount})` : ''}`}
                  </button>
                </div>
              </div>
              
              {loading.users ? (
                <div className="min-h-0 flex-1 overflow-auto">{renderLoading()}</div>
              ) : error.users ? (
                <div className="min-h-0 flex-1 overflow-auto">{renderError(error.users)}</div>
              ) : filteredDetails.length === 0 ? (
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="p-8 text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-3 text-sm font-medium text-gray-900">No user details found</h3>
                    <p className="mt-1 text-gray-500 text-xs">
                      {searchTerm ? "No users match your search criteria." : "There are no user records in the system."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-2.5 text-left">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all visible users"
                          />
                        </th>
                        <th 
                          className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            Name
                            <span className="ml-1">{getSortIcon('name')}</span>
                          </div>
                        </th>
                        <th 
                          className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center">
                            Email
                            <span className="ml-1">{getSortIcon('email')}</span>
                          </div>
                        </th>
                        <th 
                          className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('phoneNo')}
                        >
                          <div className="flex items-center">
                            Phone
                            <span className="ml-1">{getSortIcon('phoneNo')}</span>
                          </div>
                        </th>
                        <th 
                          className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('companyName')}
                        >
                          <div className="flex items-center">
                            Company
                            <span className="ml-1">{getSortIcon('companyName')}</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDetails.map((user, index) => (
                        <tr key={user.id || index} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedUsers.has(getUserKey(user, index))}
                              onChange={() => toggleOne(user, index)}
                              aria-label={`Select ${user.name || 'user'}`}
                            />
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-800 text-xs font-medium">
                                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                </span>
                              </div>
                              <div className="ml-2.5">
                                <div className="text-sm font-medium text-gray-900">{user.name || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email || '-'}</div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.phoneNo || '-'}</div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.companyName || '-'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {!loading.users && !error.users && filteredDetails.length > 0 && (
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-xs text-gray-700">
                    Showing <span className="font-medium">{filteredDetails.length}</span> of{' '}
                    <span className="font-medium">{userDetails.length}</span> users
                  </p>
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={selectedCount === 0}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      selectedCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800'
                    }`}
                  >
                    Send Template Message{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </button>
                </div>
              )}
            </AppCard>
          </>
        ) : (
          <>
            {/* Uploaded Files List */}
            <AppCard className="h-full overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Uploaded Files</h2>
                <p className="mt-1 text-xs text-gray-500">
                  History of all file uploads processed by the system
                </p>
              </div>
              
              {loading.files ? (
                <div className="min-h-0 flex-1 overflow-auto">{renderLoading()}</div>
              ) : error.files ? (
                <div className="min-h-0 flex-1 overflow-auto">{renderError(error.files)}</div>
              ) : safeUploadedFiles.length === 0 ? (
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className="p-8 text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-3 text-sm font-medium text-gray-900">No files uploaded yet</h3>
                    <p className="mt-1 text-gray-500 text-xs">
                      Get started by uploading your first data file.
                    </p>
                    <div className="mt-5">
                      <button
                        onClick={() => navigate('/file-upload')}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Upload File
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {safeUploadedFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-7 w-7 bg-indigo-100 rounded-md flex items-center justify-center">
                                {file.fileType.includes('excel') || file.fileType.includes('spreadsheet') ? (
                                  <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ) : (
                                  <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-2.5">
                                <div className="text-sm font-medium text-gray-900">{file.fileName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900 capitalize">
                              {file.fileType.includes('csv') ? 'CSV' : 
                               file.fileType.includes('excel') ? 'Excel' : 
                               file.fileType.includes('spreadsheet') ? 'Excel' : 
                               file.fileType}
                            </div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full 
                              ${file.status === 'PROCESSED' ? 'bg-green-100 text-green-800' : 
                                file.status === 'FAILED' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                              {file.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-500">
                            {file.processedRecords !== undefined && (
                              <div>
                                <span className="text-green-600">{file.processedRecords}</span>
                                {file.errorRecords > 0 && (
                                  <span className="text-red-600"> / {file.errorRecords} errors</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div>{new Date(file.uploadedAt).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-400">{new Date(file.uploadedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AppCard>
          </>
        )}
        </div>

        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[80] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Delete Selected Users?</h3>
              </div>

              <div className="px-5 py-4 text-sm text-gray-700">
                Are you sure you want to delete {pendingDeleteIds.length} selected user{pendingDeleteIds.length === 1 ? "" : "s"}?
                This action cannot be undone.
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                <AppButton
                  variant="secondary"
                  onClick={() => {
                    if (isDeleting) return;
                    setIsDeleteConfirmOpen(false);
                    setPendingDeleteIds([]);
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </AppButton>
                <AppButton
                  variant="danger"
                  onClick={handleConfirmDeleteSelected}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AppButton>
              </div>
            </div>
          </div>
        )}
    </PageLayout>
  );
}

export default ExistingList;

