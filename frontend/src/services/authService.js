// authService.js
import { auth } from "../firebase";
import { 
  onAuthStateChanged, 
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  deleteUser
} from "firebase/auth";
import { setSecureItem, getSecureItem, removeSecureItem } from "./securityService";

// Save user data securely
export const saveUserData = (user) => {
  if (user) {
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
    };
    
    // Store non-sensitive data in localStorage
    localStorage.setItem("isAuthenticated", "true");
    
    // Store user data in sessionStorage with encryption
    setSecureItem("user", userData);
  }
};

// Clear user data securely
export const clearUserData = () => {
  localStorage.removeItem("isAuthenticated");
  removeSecureItem("user");
};

// Check if user is authenticated (with Firebase check)
export const isAuthenticated = () => {
  // First check localStorage for quick response
  const localAuth = localStorage.getItem("isAuthenticated") === "true";
  
  // Also verify with Firebase if user exists
  const firebaseUser = auth.currentUser;
  
  return localAuth && !!firebaseUser;
};

// Get current user data
export const getCurrentUser = () => {
  return getSecureItem("user");
};

// Logout user
export const logout = async () => {
  try {
    // Sign out from Firebase
    await signOut(auth);
  } catch (error) {
    console.error("Firebase logout error:", error);
  } finally {
    // Clear user data from storage regardless of Firebase signOut success
    clearUserData();
    
    // Redirect to login page
    window.location.href = "/login";
  }
};

// Re-authenticate user for sensitive operations
export const reauthenticate = async (password) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No user is currently signed in");
  }
  
  const credential = EmailAuthProvider.credential(user.email, password);
  try {
    await reauthenticateWithCredential(user, credential);
    return { success: true };
  } catch (error) {
    console.error("Re-authentication error:", error);
    throw error;
  }
};

// Update user email (requires re-authentication)
export const updateUserEmail = async (newEmail, password) => {
  // First re-authenticate
  await reauthenticate(password);
  
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently signed in");
  }
  
  try {
    await updateEmail(user, newEmail);
    // Update user data in secure storage
    const userData = getCurrentUser();
    if (userData) {
      userData.email = newEmail;
      setSecureItem("user", userData);
    }
    return { success: true };
  } catch (error) {
    console.error("Email update error:", error);
    throw error;
  }
};

// Update user password (requires re-authentication)
export const updateUserPassword = async (newPassword, currentPassword) => {
  // First re-authenticate
  await reauthenticate(currentPassword);
  
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently signed in");
  }
  
  try {
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error) {
    console.error("Password update error:", error);
    throw error;
  }
};

// Send email verification
export const sendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently signed in");
  }
  
  try {
    await sendEmailVerification(user);
    return { success: true };
  } catch (error) {
    console.error("Email verification error:", error);
    throw error;
  }
};

// Delete user account (requires re-authentication)
export const deleteAccount = async (password) => {
  // First re-authenticate
  await reauthenticate(password);
  
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently signed in");
  }
  
  try {
    await deleteUser(user);
    // Clear user data from storage
    clearUserData();
    return { success: true };
  } catch (error) {
    console.error("Account deletion error:", error);
    throw error;
  }
};

// Listen for auth state changes
export const initAuthListener = () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      saveUserData(user);
    } else {
      // User is signed out
      clearUserData();
    }
  });
};