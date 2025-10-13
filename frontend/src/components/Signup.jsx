import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, OAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { saveUserData } from "../services/authService"; // ✅ Import auth service
import Captcha from "./Captcha"; // ✅ Import reCAPTCHA component

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const navigate = useNavigate();

  const handleCaptchaVerify = (isVerified) => {
    setIsCaptchaVerified(isVerified);
  };

  const validatePassword = (password) => {
    const minLength = 8; // Updated to match Firebase policy
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
      return `Password must be at least ${minLength} characters long`;
    }
    
    if (!hasUpperCase) {
      return "Password must contain at least one uppercase letter";
    }
    
    if (!hasLowerCase) {
      return "Password must contain at least one lowercase letter";
    }
    
    if (!hasNumbers) {
      return "Password must contain at least one number";
    }
    
    if (!hasSpecialChar) {
      return "Password must contain at least one special character";
    }
    
    return null; // Valid password
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setMessage("Please fill in all fields");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Please enter a valid email address");
      return;
    }

    // Email domain validation
    const allowedDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'aol.com',
      'icloud.com',
      'protonmail.com',
      'mail.com',
      'live.com',
      'company.com'  // Add your company domain here
    ];
    
    const emailDomain = email.split('@')[1].toLowerCase();
    if (!allowedDomains.includes(emailDomain)) {
      setMessage(`Email domain ${emailDomain} is not allowed. Please use a valid email domain.`);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match. Please check your passwords.");
      return;
    }

    // Password strength validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    // Check if CAPTCHA is verified
    if (!isCaptchaVerified) {
      setMessage("Please complete the security verification");
      return;
    }

    setIsLoading(true);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: name
      });

      // Save user details using auth service
      saveUserData(user);

      setMessage("Account created successfully!");
      setTimeout(() => navigate("/welcome"), 1500);

    } catch (error) {
      console.error("Signup Error:", error);
      let errorMsg = "Signup failed. Please try again.";
      if (error.code === "auth/email-already-in-use") errorMsg = "Email is already registered. Please use a different email or log in.";
      if (error.code === "auth/invalid-email") errorMsg = "Your email is invalid. Please check your email address.";
      if (error.code === "auth/weak-password") errorMsg = "Password does not meet security requirements. Please create a stronger password.";
      if (error.code === "auth/operation-not-allowed") errorMsg = "Signup is currently disabled.";
      // Additional error handling
      if (error.code === "auth/network-request-failed") errorMsg = "Network error. Please check your connection.";
      if (error.code === "auth/too-many-requests") errorMsg = "Too many requests. Please try again later.";
      
      // Handle Firebase password policy errors
      if (error.message && error.message.includes("password")) {
        errorMsg = "Password does not meet security requirements. Please ensure it's at least 8 characters with uppercase, lowercase, number, and special character.";
      }
      
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-Up
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setMessage(""); // Clear any previous messages
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user details using auth service
      saveUserData(user);

      setMessage("Authentication successful!");
      setTimeout(() => navigate("/welcome"), 1000);

    } catch (error) {
      console.error("Google Authentication Error:", error);
      console.log("Google error code:", error.code);
      console.log("Google error message:", error.message);
      
      let errorMsg = "Authentication failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Authentication popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Authentication was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
        // Redirect to login page with message
        setMessage(errorMsg); // Set the message first
        setTimeout(() => {
          navigate("/login", { state: { message: errorMsg } });
        }, 2000);
        return; // Exit early to avoid setting the message again
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Microsoft Sign-Up
  const handleMicrosoftSignUp = async () => {
    setIsLoading(true);
    setMessage(""); // Clear any previous messages
    
    try {
      const provider = new OAuthProvider('microsoft.com');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user details using auth service
      saveUserData(user);

      setMessage("Authentication successful!");
      setTimeout(() => navigate("/welcome"), 1000);

    } catch (error) {
      console.error("Microsoft Authentication Error:", error);
      console.log("Microsoft error code:", error.code);
      console.log("Microsoft error message:", error.message);
      
      let errorMsg = "Authentication failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Authentication popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Authentication was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
        // Redirect to login page with message
        setMessage(errorMsg); // Set the message first
        setTimeout(() => {
          navigate("/login", { state: { message: errorMsg } });
        }, 2000);
        return; // Exit early to avoid setting the message again
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitHub Sign-Up
  const handleGitHubSignUp = async () => {
    setIsLoading(true);
    setMessage(""); // Clear any previous messages
    
    try {
      const provider = new OAuthProvider('github.com');
      // Add scopes for GitHub OAuth
      provider.addScope('read:user');
      provider.addScope('user:email');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user details using auth service
      saveUserData(user);

      setMessage("Authentication successful!");
      setTimeout(() => navigate("/welcome"), 1000);

    } catch (error) {
      console.error("GitHub Authentication Error:", error);
      console.log("GitHub error code:", error.code);
      console.log("GitHub error message:", error.message);
      
      let errorMsg = "Authentication failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Authentication popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Authentication was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
        // Redirect to login page with message
        setMessage(errorMsg); // Set the message first
        setTimeout(() => {
          navigate("/login", { state: { message: errorMsg } });
        }, 2000);
        return; // Exit early to avoid setting the message again
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-blue-100 text-sm mt-1">Sign up to get started</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (message) setMessage("");
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (message) setMessage("");
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (message) setMessage("");
                  }}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center text-xs mb-1">
                    <span className="text-gray-500">Password requirements:</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      {password.length >= 8 ? (
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center">
                      {/[A-Z]/.test(password) ? (
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                        One uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center">
                      {/[a-z]/.test(password) ? (
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                        One lowercase letter
                      </span>
                    </div>
                    <div className="flex items-center">
                      {/\d/.test(password) ? (
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${/\d/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                        One number
                      </span>
                    </div>
                    <div className="flex items-center">
                      {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? (
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={`text-xs ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                        One special character
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (message) setMessage("");
                  }}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password match indicator */}
              {confirmPassword && (
                <div className="mt-2">
                  <div className="flex items-center">
                    {password === confirmPassword ? (
                      <>
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-green-600">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-xs text-red-600">Passwords do not match</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CAPTCHA */}
            <Captcha onVerify={handleCaptchaVerify} />

            {/* Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 transform hover:-translate-y-0.5"
                }`}
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          {/* Social Sign-Up Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google Sign-Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              className={`flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.475-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="#24292e"/>
              </svg>
              Google
            </button>

            {/* Microsoft Sign-Up Button */}
            <button
              type="button"
              onClick={handleMicrosoftSignUp}
              disabled={isLoading}
              className={`flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#0078D4"/>
              </svg>
              Microsoft
            </button>

            {/* GitHub Sign-Up Button */}
            <button
              type="button"
              onClick={handleGitHubSignUp}
              disabled={isLoading}
              className={`flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.475-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="#24292e"/>
              </svg>
              GitHub
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm font-medium text-center ${
                message.includes("success")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-150"
              >
                Sign in
              </Link>
            </p>
            <p className="mt-2 text-xs text-gray-400">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;