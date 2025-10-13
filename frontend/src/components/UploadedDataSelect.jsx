import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

function UploadedDataSelect() {
  const [userDetails, setUserDetails] = useState([]);
  const [filteredDetails, setFilteredDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUploadedData = async () => {
      if (!location.state?.fileId) {
        setError("No file information found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:8080/api/files/${location.state.fileId}/user-details`
        );
        setUserDetails(response.data || []);
        setFilteredDetails(response.data || []);
      } catch (err) {
        setError("Error fetching uploaded data");
        console.error("Error fetching uploaded data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUploadedData();
  }, [location.state?.fileId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredDetails(userDetails);
      return;
    }
    const filtered = userDetails.filter((user) =>
      Object.values(user).some(
        (val) => val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredDetails(filtered);
  }, [searchTerm, userDetails]);

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
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
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

  // Selection helpers
  const getUserKey = (user, index) =>
    user.id ?? `${user.email ?? ""}-${user.phoneNo ?? ""}-${index}`;
  const allVisibleSelected =
    filteredDetails.length > 0 &&
    filteredDetails.every((u, i) => selectedUsers.has(getUserKey(u, i)));
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
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedUsers(next);
  };
  const selectedCount = filteredDetails.reduce(
    (acc, u, i) => acc + (selectedUsers.has(getUserKey(u, i)) ? 1 : 0),
    0
  );

  const handleContinue = () => {
    const selected = filteredDetails
      .map((u, i) => ({ u, i }))
      .filter(({ u, i }) => selectedUsers.has(getUserKey(u, i)))
      .map(({ u }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phoneNo: u.phoneNo,
        companyName: u.companyName,
      }));
    navigate("/templates", { state: { selected } });
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

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Uploaded User Details</h2>
              <p className="mt-1 text-xs text-gray-500">Showing only the data from your recently uploaded file</p>
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
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-2.5 text-left">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all visible records"
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
                            aria-label={`Select ${user.name || 'record'}`}
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

              <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-700">
                  Showing <span className="font-medium">{filteredDetails.length}</span> of{' '}
                  <span className="font-medium">{userDetails.length}</span> records
                </p>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={selectedCount === 0}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    selectedCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Continue{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadedDataSelect;
