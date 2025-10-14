import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuthProtection } from '../hooks/useAuthProtection';

function UploadedDataSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Protect this component from unauthorized access
  useAuthProtection();

  const [userDetails, setUserDetails] = useState([]);
  const [filteredDetails, setFilteredDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  useEffect(() => {
    const fetchUploadedData = async () => {
      console.log("Location state in UploadedDataSelect:", location.state);
      
      if (!location.state?.fileId) {
        setError("No file information found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`Fetching user details for file ID: ${location.state.fileId}`);
        
        // Use the api service instead of direct axios call
        const response = await api.get(`/files/${location.state.fileId}/user-details`);
        console.log("API Response in UploadedDataSelect:", response);
        
        // Ensure we're working with arrays
        const userData = Array.isArray(response.data.data) ? response.data.data : [];
        console.log("User data received in UploadedDataSelect:", userData);
        
        setUserDetails(userData);
        setFilteredDetails(userData);
      } catch (err) {
        console.error("Error fetching uploaded data in UploadedDataSelect:", err);
        setError("Error fetching uploaded data: " + (err.response?.data?.message || err.message));
        // Set empty arrays on error to prevent map errors
        setUserDetails([]);
        setFilteredDetails([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUploadedData();
  }, [location.state?.fileId]);

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

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"></div>
      <p className="text-gray-600 text-sm">Loading your uploaded data...</p>
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
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return "↕";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Uploaded Data</h1>
              <p className="text-gray-600 mt-1">View and manage the data from your recent file upload</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/file-upload')}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md text-sm font-medium hover:from-blue-700 hover:to-indigo-800 flex items-center"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Another
              </button>
              <button
                onClick={() => navigate('/existing-list')}
                className="px-3 py-1.5 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 text-sm flex items-center"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                View All Data
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {location.state?.fileName && (
          <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <h3 className="text-sm font-medium text-green-800">File Uploaded Successfully!</h3>
                <div className="mt-1 text-green-700 text-xs">
                  <p>
                    File "<span className="font-semibold">{location.state.fileName}</span>" has been processed.
                    {location.state.processedRecords > 0 && ` ${location.state.processedRecords} records imported.`}
                    {location.state.errorRecords > 0 && ` ${location.state.errorRecords} records had errors.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-md mr-3">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Records</p>
                <p className="text-lg font-bold text-gray-900">{userDetails.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-md mr-3">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Processed</p>
                <p className="text-lg font-bold text-gray-900">{location.state?.processedRecords || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="bg-amber-100 p-2 rounded-md mr-3">
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Errors</p>
                <p className="text-lg font-bold text-gray-900">{location.state?.errorRecords || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Uploaded User Details</h2>
              <p className="mt-1 text-xs text-gray-500">
                Showing only the data from your recently uploaded file
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
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {loading ? (
            renderLoading()
          ) : error ? (
            renderError(error)
          ) : filteredDetails.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-3 text-sm font-medium text-gray-900">No user details found</h3>
              <p className="mt-1 text-gray-500 text-xs">
                {searchTerm ? "No records match your search criteria." : "No user details found in the uploaded file."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
          
          {!loading && !error && filteredDetails.length > 0 && (
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
              <p className="text-xs text-gray-700">
                Showing <span className="font-medium">{filteredDetails.length}</span> of{' '}
                <span className="font-medium">{userDetails.length}</span> records
              </p>
            </div>
          )}
        </div>
        
        {/* Continue Button */}
        {location.state?.fileId && filteredDetails.length > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => navigate('/templates', { state: { fileId: location.state.fileId } })}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md font-medium hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue to Templates
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadedDataSelect;