// securityService.js
// Utility functions for handling sensitive data securely

// Simple encryption/decryption for client-side storage
// Note: This is not a replacement for server-side security but adds an extra layer
const SECRET_KEY = "htc_meta_project_secret_key_2025"; // In a real app, this should be more secure

// Encrypt data before storing
export const encryptData = (data) => {
  try {
    const jsonData = JSON.stringify(data);
    // Simple XOR encryption (not for production use)
    let encrypted = "";
    for (let i = 0; i < jsonData.length; i++) {
      encrypted += String.fromCharCode(
        jsonData.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
      );
    }
    return btoa(encrypted); // Base64 encode
  } catch (error) {
    console.error("Encryption error:", error);
    return null;
  }
};

// Decrypt data after retrieving
export const decryptData = (encryptedData) => {
  try {
    const decoded = atob(encryptedData); // Base64 decode
    let decrypted = "";
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(
        decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
      );
    }
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

// Securely store sensitive data
export const setSecureItem = (key, value) => {
  const encrypted = encryptData(value);
  if (encrypted) {
    sessionStorage.setItem(key, encrypted);
    return true;
  }
  return false;
};

// Securely retrieve sensitive data
export const getSecureItem = (key) => {
  const encrypted = sessionStorage.getItem(key);
  if (encrypted) {
    return decryptData(encrypted);
  }
  return null;
};

// Remove sensitive data
export const removeSecureItem = (key) => {
  sessionStorage.removeItem(key);
};

// Clear all sensitive data
export const clearSecureStorage = () => {
  sessionStorage.clear();
};