import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, OAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase"; // ✅ Import Firebase Auth
import { saveUserData } from "../services/authService"; // ✅ Import auth service
import Captcha from "./Captcha"; // ✅ Import reCAPTCHA component
import { useRedirectIfAuthenticated } from "../hooks/useAuthProtection";

function Login() {
  const [username, setUsername] = useState(""); // Firebase uses email as username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // For toggling password visibility
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users away from login page
  useRedirectIfAuthenticated();

  // Check for redirect message from signup
  useEffect(() => {
    if (location.state && location.state.message) {
      setMessage(location.state.message);
      // Don't clear the state immediately, let it persist for a short time
      const timer = setTimeout(() => {
        // Clear the state after a delay to allow for proper display
        window.history.replaceState({}, document.title, "/login");
      }, 5000); // Clear after 5 seconds
      
      // Clean up the timer if component unmounts
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleCaptchaVerify = (isVerified) => {
    setIsCaptchaVerified(isVerified);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setMessage("Please fill in all fields");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
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
    
    const emailDomain = username.split('@')[1].toLowerCase();
    if (!allowedDomains.includes(emailDomain)) {
      setMessage(`Email domain ${emailDomain} is not allowed. Please use a valid email domain.`);
      return;
    }

    // Check if CAPTCHA is verified
    if (!isCaptchaVerified) {
      setMessage("Please complete the security verification");
      return;
    }

    setIsLoading(true);
    try {
      // ✅ Firebase email-password authentication
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      const user = userCredential.user;

      // Save user details using auth service
      saveUserData(user);

      setMessage("Login successful!");
      setTimeout(() => navigate("/welcome"), 1000);

    } catch (error) {
      console.error("Firebase Login Error:", error);
      console.log("Firebase error code:", error.code);
      console.log("Firebase error message:", error.message);
      
      let errorMsg = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found") errorMsg = "No user found with this email.";
      if (error.code === "auth/wrong-password") errorMsg = "Incorrect password.";
      if (error.code === "auth/invalid-email") errorMsg = "Your email is invalid. Please check your email address.";
      if (error.code === "auth/user-disabled") errorMsg = "This account has been disabled.";
      if (error.code === "auth/too-many-requests") errorMsg = "Too many failed attempts. Please try again later.";
      
      // Handle Firebase password policy errors
      if (error.message && error.message.includes("password")) {
        errorMsg = "Password does not meet security requirements. Please ensure it's at least 8 characters with uppercase, lowercase, number, and special character.";
      }
      
      // Fallback to show the actual error code if none of the above match
      if (errorMsg === "Login failed. Please try again.") {
        errorMsg = `Login error: ${error.message} (Code: ${error.code})`;
      }
      
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user details using auth service
      saveUserData(user);

      setMessage("Google sign-in successful!");
      setTimeout(() => navigate("/welcome"), 1000);

    } catch (error) {
      console.error("Google Sign-In Error:", error);
      let errorMsg = "Google sign-in failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Sign-in popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Sign-in was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in !!.";
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Microsoft Sign-In
  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new OAuthProvider('microsoft.com');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user details using auth service
      saveUserData(user);

      setMessage("Microsoft sign-in successful!");
      setTimeout(() => navigate("/welcome"), 1000);

    } catch (error) {
      console.error("Microsoft Sign-In Error:", error);
      let errorMsg = "Microsoft sign-in failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Sign-in popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Sign-in was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitHub Sign-In
  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new OAuthProvider('github.com');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Save user details using auth service
      saveUserData(user);

      setMessage("GitHub sign-in successful!");
      setTimeout(() => navigate("/welcome"), 1000);

    } catch (error) {
      console.error("GitHub Sign-In Error:", error);
      let errorMsg = "GitHub sign-in failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Sign-in popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Sign-in was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage("Please enter your email address");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetMessage("Please enter a valid email address");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      let errorMsg = "Failed to send reset email. Please try again.";
      if (error.code === "auth/user-not-found") errorMsg = "No account found with this email.";
      if (error.code === "auth/invalid-email") errorMsg = "Invalid email address.";
      if (error.code === "auth/too-many-requests") errorMsg = "Too many requests. Please try again later.";
      setResetMessage(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with Signup button */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome Back</h1>
              <p className="text-blue-100 text-sm mt-1">Please sign in to your account</p>
            </div>
            <Link
              to="/signup"
              className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 text-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (message) setMessage("");
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-blue-600 hover:text-blue-500 font-medium focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (message) setMessage("");
                  }}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    // Eye slash icon (visible)
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    // Eye icon (hidden)
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Password strength reminder (for login) */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center text-xs mb-1">
                    <span className="text-gray-500">Password must contain:</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500">
                        8+ characters, uppercase, lowercase, number, special char
                      </span>
                    </div>
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
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social Sign-In Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4"/>
              </svg>
              Google
            </button>

            {/* Microsoft Sign-In Button */}
            <button
              type="button"
              onClick={handleMicrosoftSignIn}
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

            {/* GitHub Sign-In Button */}
            <button
              type="button"
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className={`flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                isLoading ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="#24292e"/>
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
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-150"
              >
                Sign up
              </Link>
            </p>
            <p className="mt-2 text-xs text-gray-400">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                    setResetMessage("");
                  }}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleForgotPassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      if (resetMessage) setResetMessage("");
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
                
                {resetMessage && (
                  <div
                    className={`mb-4 p-3 rounded-lg text-sm font-medium text-center ${
                      resetMessage.includes("sent") || resetMessage.includes("success")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail("");
                      setResetMessage("");
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      isLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;