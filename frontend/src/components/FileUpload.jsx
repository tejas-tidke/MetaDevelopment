import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthProtection } from '../hooks/useAuthProtection';
import WorkspaceHeader from './WorkspaceHeader';
import AppButton from './ui/AppButton';
import AppCard from './ui/AppCard';
import AppAlert from './ui/AppAlert';
import PageLayout from './ui/PageLayout';

function FileUpload() {
  const navigate = useNavigate();
  
  // Protect this component from unauthorized access
  useAuthProtection();

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const ALLOWED_FILE_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Reset state
    setMessage('');
    setMessageTone('info');
    setUploadProgress(0);
    setIsDuplicateModalOpen(false);
    setDuplicateInfo(null);

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      setMessage('Invalid file type. Please upload a CSV or Excel file.');
      setMessageTone('error');
      setFile(null);
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setMessage('File size exceeds the maximum limit of 5MB');
      setMessageTone('error');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const uploadFileWithPreference = async (keepDuplicates) => {
    if (!file) {
      setMessage('Please select a file first');
      setMessageTone('error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setMessage(keepDuplicates ? 'Uploading file and keeping duplicates...' : 'Uploading file...');
    setMessageTone('info');
    setUploadProgress(10);

    try {
      const response = await api.post('/upload', formData, {
        params: { keepDuplicates },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const progress = Math.round((progressEvent.loaded * 90) / total);
          setUploadProgress(10 + progress);
        },
      });

      const responseData = response.data || {};
      const uploadedFile = responseData.file || {};
      const processedRecords = uploadedFile.processedRecords || 0;
      const errorRecords = uploadedFile.errorRecords || 0;
      const uploadMessage =
        responseData.message ||
        `File processed: ${processedRecords} records imported and ${errorRecords} rows skipped.`;
      const warningDetails = responseData.warnings || uploadedFile.errorMessage || '';

      setUploadProgress(100);
      setMessage(uploadMessage);
      setMessageTone(errorRecords > 0 ? 'warn' : 'success');

      setTimeout(() => {
        navigate('/uploaded-data', {
          state: {
            fileId: uploadedFile.id,
            fileName: file.name,
            processedRecords,
            errorRecords,
            uploadMessage,
            warningDetails
          }
        });
      }, 1000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(0);

      let errorMessage = 'Error uploading file';
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data?.message || error.response.data || 'Invalid file format';
        } else if (error.response.status === 413) {
          errorMessage = 'File is too large. Maximum size is 5MB';
        } else if (error.response.status === 500) {
          errorMessage = error.response.data?.message || 'Server error. Please try again later.';
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }

      setMessage(errorMessage);
      setMessageTone('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      setMessageTone('error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setMessage('Checking duplicate contacts...');
    setMessageTone('info');
    setUploadProgress(5);

    try {
      const checkResponse = await api.post('/upload/check-duplicates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const checkData = checkResponse.data || {};
      const totalDuplicates = Number(checkData.totalDuplicates || 0);

      if (checkData.status === 'duplicates_found' && totalDuplicates > 0) {
        setDuplicateInfo(checkData);
        setIsDuplicateModalOpen(true);
        setMessage(
          `${totalDuplicates} duplicate contact(s) found. Choose whether to keep or skip duplicates.`
        );
        setMessageTone('warn');
        setUploadProgress(0);
        return;
      }

      await uploadFileWithPreference(false);
    } catch (error) {
      console.error('Error checking duplicates:', error);
      const fallbackMessage =
        error.response?.data?.message || 'Unable to check duplicates. Please try again.';
      setMessage(fallbackMessage);
      setMessageTone('error');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeepDuplicates = async () => {
    setIsDuplicateModalOpen(false);
    await uploadFileWithPreference(true);
  };

  const handleSkipDuplicates = async () => {
    setIsDuplicateModalOpen(false);
    await uploadFileWithPreference(false);
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
    <PageLayout>
        <WorkspaceHeader
          title="Upload User Data"
          subtitle="Upload a CSV or Excel file containing user details."
          backFallback="/existing-list"
          actions={<AppButton onClick={() => navigate('/existing-list')}>View All Data</AppButton>}
        />
        
        <AppCard className="p-5">
          <div className="space-y-6">
            {/* Drag and Drop Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="bg-blue-100 p-2 rounded-full mb-3">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  {file ? 'File Selected' : 'Drag & Drop files here'}
                </h3>
                <p className="text-gray-500 text-sm mb-3">
                  {file ? file.name : 'or click to browse files'}
                </p>
                <AppButton type="button" variant="primary">
                  Browse Files
                </AppButton>
                <p className="text-xs text-gray-400 mt-3">
                  Supported formats: CSV, XLS, XLSX (Max size: 5MB)
                </p>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
                className="sr-only"
                disabled={isUploading}
              />
            </div>

            {/* File Preview */}
            {file && (
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-1.5 rounded-md mr-3">
                      <svg
                        className="h-5 w-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2V5a2 2 0 002-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-xs text-sm">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-200"
                    disabled={isUploading}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            )}

            {/* Status Message */}
            {message && (
              <AppAlert
                tone={messageTone}
                title={
                  messageTone === "success"
                    ? "File Upload Complete"
                    : messageTone === "warn"
                      ? "Upload Warning"
                      : messageTone === "error"
                        ? "Upload Failed"
                        : "Uploading"
                }
                toastKey={`${messageTone}:${message}`}
                onClose={() => setMessage("")}
              >
                {message}
              </AppAlert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <AppButton onClick={() => navigate('/existing-list')} disabled={isUploading}>
                View All Data
              </AppButton>
              <AppButton onClick={handleUpload} variant="primary" disabled={!file || isUploading}>
                {isUploading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload File
                  </span>
                )}
              </AppButton>
            </div>
          </div>
        </AppCard>

        {isDuplicateModalOpen && (
          <div className="fixed inset-0 z-[80] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Duplicate Contacts Found</h3>
              </div>

              <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
                <p>
                  We found <span className="font-semibold">{duplicateInfo?.totalDuplicates || 0}</span> duplicate contact(s).
                </p>
                <p className="text-xs text-gray-600">
                  In file duplicates: {duplicateInfo?.duplicateInFileCount || 0} | Existing in system: {duplicateInfo?.duplicateInDatabaseCount || 0}
                </p>
                <p className="text-sm text-gray-600">
                  Do you want to keep duplicate contacts in this upload?
                </p>
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex flex-wrap justify-end gap-2">
                <AppButton
                  variant="secondary"
                  onClick={() => setIsDuplicateModalOpen(false)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  variant="secondary"
                  onClick={handleSkipDuplicates}
                >
                  Don&apos;t Keep Duplicates
                </AppButton>
                <AppButton
                  variant="primary"
                  onClick={handleKeepDuplicates}
                >
                  Keep Duplicates
                </AppButton>
              </div>
            </div>
          </div>
        )}
    </PageLayout>
  );
}

export default FileUpload;
