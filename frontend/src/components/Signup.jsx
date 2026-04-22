import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase";
import { saveUserData } from "../services/authService";
import Captcha from "./Captcha";
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

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passwordsMatch = !!confirmPassword && password === confirmPassword;

  const handleCaptchaVerify = useCallback((isVerified) => {
    setIsCaptchaVerified(isVerified);
  }, []);

  const validatePassword = (candidate) => {
    if (candidate.length < 8) {
      return "Password must be at least 8 characters long";
    }

    if (!/[A-Z]/.test(candidate)) {
      return "Password must contain at least one uppercase letter";
    }

    if (!/[a-z]/.test(candidate)) {
      return "Password must contain at least one lowercase letter";
    }

    if (!/\d/.test(candidate)) {
      return "Password must contain at least one number";
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(candidate)) {
      return "Password must contain at least one special character";
    }

    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      setMessage("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Please enter a valid email address");
      return;
    }

    const emailDomain = email.split("@")[1].toLowerCase();
    if (!ALLOWED_DOMAINS.includes(emailDomain)) {
      setMessage(`Email domain ${emailDomain} is not allowed. Please use a valid email domain.`);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match. Please check your passwords.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }

    if (!isCaptchaVerified) {
      setMessage("Please complete the security verification");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name,
      });

      saveUserData(user);

      setMessage("Account created successfully!");
      setTimeout(() => navigate("/app/dashboard"), 1500);
    } catch (error) {
      console.error("Signup Error:", error);
      let errorMsg = "Signup failed. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMsg = "Email is already registered. Please use a different email or log in.";
      }
      if (error.code === "auth/invalid-email") {
        errorMsg = "Your email is invalid. Please check your email address.";
      }
      if (error.code === "auth/weak-password") {
        errorMsg = "Password does not meet security requirements. Please create a stronger password.";
      }
      if (error.code === "auth/operation-not-allowed") {
        errorMsg = "Signup is currently disabled.";
      }
      if (error.code === "auth/network-request-failed") {
        errorMsg = "Network error. Please check your connection.";
      }
      if (error.code === "auth/too-many-requests") {
        errorMsg = "Too many requests. Please try again later.";
      }

      if (error.message && error.message.includes("password")) {
        errorMsg =
          "Password does not meet security requirements. Please ensure it includes uppercase, lowercase, a number, and a special character.";
      }

      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      saveUserData(user);

      setMessage("Authentication successful!");
      setTimeout(() => navigate("/app/dashboard"), 1000);
    } catch (error) {
      console.error("Google Authentication Error:", error);

      let errorMsg = "Authentication failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Authentication popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Authentication was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
        setMessage(errorMsg);
        setTimeout(() => {
          navigate("/auth/login", { state: { message: errorMsg } });
        }, 2000);
        return;
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignUp = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const provider = new OAuthProvider("microsoft.com");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      saveUserData(user);

      setMessage("Authentication successful!");
      setTimeout(() => navigate("/app/dashboard"), 1000);
    } catch (error) {
      console.error("Microsoft Authentication Error:", error);

      let errorMsg = "Authentication failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Authentication popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Authentication was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
        setMessage(errorMsg);
        setTimeout(() => {
          navigate("/auth/login", { state: { message: errorMsg } });
        }, 2000);
        return;
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubSignUp = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const provider = new OAuthProvider("github.com");
      provider.addScope("read:user");
      provider.addScope("user:email");

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      saveUserData(user);

      setMessage("Authentication successful!");
      setTimeout(() => navigate("/app/dashboard"), 1000);
    } catch (error) {
      console.error("GitHub Authentication Error:", error);

      let errorMsg = "Authentication failed. Please try again.";
      if (error.code === "auth/popup-closed-by-user") errorMsg = "Authentication popup was closed.";
      if (error.code === "auth/cancelled-popup-request") errorMsg = "Authentication was cancelled.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMsg = "An account already exists with this email. Please sign in using your original authentication method.";
        setMessage(errorMsg);
        setTimeout(() => {
          navigate("/auth/login", { state: { message: errorMsg } });
        }, 2000);
        return;
      }
      setMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <main className="auth-card">
        <div className="auth-card-top">
          <span className="auth-brand-label">Sign Up</span>
          <Link to="/auth/login" className="auth-switch-link">
            Already registered?
          </Link>
        </div>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subcopy">Use your work details and set a strong password to get started.</p>

        <form onSubmit={handleSignup} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (message) setMessage("");
              }}
              className="auth-input"
              placeholder="Enter your full name"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (message) setMessage("");
              }}
              className="auth-input"
              placeholder="name@company.com"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (message) setMessage("");
                }}
                className="auth-input with-toggle"
                placeholder="Create a password"
              />
              <AuthPasswordToggle isVisible={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />
            </div>

            {password && (
              <ul className="auth-requirements">
                <li className={`auth-requirement ${passwordChecks.length ? "met" : ""}`}>
                  {passwordChecks.length ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  At least 8 characters
                </li>
                <li className={`auth-requirement ${passwordChecks.upper ? "met" : ""}`}>
                  {passwordChecks.upper ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  One uppercase letter
                </li>
                <li className={`auth-requirement ${passwordChecks.lower ? "met" : ""}`}>
                  {passwordChecks.lower ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  One lowercase letter
                </li>
                <li className={`auth-requirement ${passwordChecks.number ? "met" : ""}`}>
                  {passwordChecks.number ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  One number
                </li>
                <li className={`auth-requirement ${passwordChecks.special ? "met" : ""}`}>
                  {passwordChecks.special ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  One special character
                </li>
              </ul>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm password</label>
            <div className="auth-input-wrap">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (message) setMessage("");
                }}
                className="auth-input with-toggle"
                placeholder="Confirm your password"
              />
              <AuthPasswordToggle
                isVisible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((prev) => !prev)}
              />
            </div>

            {confirmPassword && (
              <div className={`auth-requirement ${passwordsMatch ? "met" : ""}`}>
                {passwordsMatch ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
              </div>
            )}
          </div>

          <Captcha onVerify={handleCaptchaVerify} />

          <AuthButton type="submit" variant="submit" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </AuthButton>
        </form>

        <div className="auth-divider">or continue with</div>

        <div className="auth-social-grid">
          <AuthButton type="button" variant="social" onClick={handleGoogleSignUp} disabled={isLoading}>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
                fill="#4285F4"
              />
            </svg>
            Google
          </AuthButton>

          <AuthButton type="button" variant="social" onClick={handleMicrosoftSignUp} disabled={isLoading}>
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
            onClick={handleGitHubSignUp}
            disabled={isLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.475-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
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
            Already have an account? <Link to="/auth/login">Sign in</Link>
          </p>
        </div>
      </main>
    </AuthLayout>
  );
}

export default Signup;
