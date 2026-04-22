import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { saveUserData } from "../services/authService";
import Captcha from "./Captcha";
import { useRedirectIfAuthenticated } from "../hooks/useAuthProtection";
import AuthLayout from "./ui/AuthLayout";
import AuthAlert from "./ui/AuthAlert";
import AuthButton from "./ui/AuthButton";
import AuthPasswordToggle from "./ui/AuthPasswordToggle";

const ALLOWED_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "protonmail.com",
  "mail.com",
  "live.com",
  "company.com",
];

const isSuccessMessage = (text) =>
  /(success|sent|created|authenticated|welcome)/i.test(text || "");

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || "/app/dashboard";

  const isCheckingAuth = useRedirectIfAuthenticated();

  useEffect(() => {
    if (location.state && location.state.message) {
      setMessage(location.state.message);
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title, "/auth/login");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail("");
    setResetMessage("");
  };

  const handleCaptchaVerify = useCallback((isVerified) => {
    setIsCaptchaVerified(isVerified);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setMessage("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      setMessage("Please enter a valid email address");
      return;
    }

    const emailDomain = username.split("@")[1].toLowerCase();
    if (!ALLOWED_DOMAINS.includes(emailDomain)) {
      setMessage(`Email domain ${emailDomain} is not allowed. Please use a valid email domain.`);
      return;
    }

    if (!isCaptchaVerified) {
      setMessage("Please complete the security verification");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      const user = userCredential.user;

      saveUserData(user);

      setMessage("Login successful!");
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      console.error("Firebase Login Error:", error);

      let errorMsg = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found") errorMsg = "No user found with this email.";
      if (error.code === "auth/wrong-password") errorMsg = "Incorrect password.";
      if (error.code === "auth/invalid-email") errorMsg = "Your email is invalid. Please check your email address.";
      if (error.code === "auth/user-disabled") errorMsg = "This account has been disabled.";
      if (error.code === "auth/too-many-requests") errorMsg = "Too many failed attempts. Please try again later.";

      if (error.message && error.message.includes("password")) {
        errorMsg =
          "Password does not meet security requirements. Please ensure it includes uppercase, lowercase, a number, and a special character.";
      }

      if (errorMsg === "Login failed. Please try again.") {
        errorMsg = `Login error: ${error.message} (Code: ${error.code})`;
      }

      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      saveUserData(user);

      setMessage("Google sign-in successful!");
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      let errorMsg = "Google sign-in failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Sign-in popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Sign-in was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in.";
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new OAuthProvider("microsoft.com");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      saveUserData(user);

      setMessage("Microsoft sign-in successful!");
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      console.error("Microsoft Sign-In Error:", error);
      let errorMsg = "Microsoft sign-in failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Sign-in popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Sign-in was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original method.";
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new OAuthProvider("github.com");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      saveUserData(user);

      setMessage("GitHub sign-in successful!");
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      console.error("GitHub Sign-In Error:", error);
      let errorMsg = "GitHub sign-in failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Sign-in popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Sign-in was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original method.";
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

  if (isCheckingAuth) {
    return (
      <AuthLayout>
        <main className="auth-card">
          <h1 className="auth-heading">Checking session...</h1>
          <p className="auth-subcopy">Please wait while we verify your sign-in state.</p>
        </main>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <main className="auth-card">
        <div className="auth-card-top">
          <span className="auth-brand-label">Sign In</span>
          <Link to="/auth/signup" className="auth-switch-link">
            Create account
          </Link>
        </div>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-subcopy">Continue with your email and password to access your workspace.</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (message) setMessage("");
              }}
              className="auth-input"
              placeholder="name@company.com"
            />
          </div>

          <div className="auth-field">
            <div className="auth-field-top">
              <label className="auth-label">Password</label>
              <button type="button" className="auth-inline-link" onClick={() => setShowForgotPassword(true)}>
                Forgot password?
              </button>
            </div>

            <div className="auth-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (message) setMessage("");
                }}
                className="auth-input with-toggle"
                placeholder="Enter your password"
              />
              <AuthPasswordToggle isVisible={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />
            </div>

            {password && (
              <p className="auth-pass-note">Use at least 8 chars with uppercase, lowercase, number, and special character.</p>
            )}
          </div>

          <Captcha onVerify={handleCaptchaVerify} />

          <AuthButton type="submit" variant="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </AuthButton>
        </form>

        <div className="auth-divider">or continue with</div>

        <div className="auth-social-grid">
          <AuthButton type="button" variant="social" onClick={handleGoogleSignIn} disabled={isLoading}>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                fill="#4285F4"
              />
            </svg>
            Google
          </AuthButton>

          <AuthButton type="button" variant="social" onClick={handleMicrosoftSignIn} disabled={isLoading}>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"
                fill="#0078D4"
              />
            </svg>
            Microsoft
          </AuthButton>

          <AuthButton
            type="button"
            variant="social"
            fullWidth
            onClick={handleGitHubSignIn}
            disabled={isLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                fill="#24292e"
              />
            </svg>
            GitHub
          </AuthButton>
        </div>

        {message && (
          <AuthAlert
            tone={isSuccessMessage(message) ? "success" : "error"}
            title={isSuccessMessage(message) ? "Success" : "Error"}
            toastKey={message}
            onClose={() => setMessage("")}
          >
            {message}
          </AuthAlert>
        )}

        <div className="auth-footer">
          <p>
            New here? <Link to="/auth/signup">Create your account</Link>
          </p>
          
        </div>
      </main>
      {showForgotPassword && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal">
            <div className="auth-modal-head">
              <h3>Reset password</h3>
              <button type="button" onClick={closeForgotPasswordModal} className="auth-modal-close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    if (resetMessage) setResetMessage("");
                  }}
                  className="auth-input"
                  placeholder="name@company.com"
                />
              </div>

              {resetMessage && (
                <AuthAlert
                  tone={isSuccessMessage(resetMessage) ? "success" : "error"}
                  title={isSuccessMessage(resetMessage) ? "Success" : "Error"}
                  toastKey={resetMessage}
                  onClose={() => setResetMessage("")}
                >
                  {resetMessage}
                </AuthAlert>
              )}

              <div className="auth-modal-actions">
                <AuthButton type="button" variant="muted" onClick={closeForgotPasswordModal}>
                  Cancel
                </AuthButton>
                <AuthButton type="submit" variant="primary" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send reset link"}
                </AuthButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default Login;
