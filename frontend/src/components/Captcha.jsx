import React, { useState, useEffect, useCallback } from "react";

function Captcha({ onVerify }) {
  const [isVerified, setIsVerified] = useState(false);

  const renderRecaptcha = useCallback(() => {
    if (!window.grecaptcha) return;

    setTimeout(() => {
      const container = document.getElementById("recaptcha-container");
      if (container && !container.hasChildNodes()) {
        window.grecaptcha.render("recaptcha-container", {
          sitekey: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
          callback: (token) => {
            console.log("reCAPTCHA verified with token:", token);
            setIsVerified(true);
            onVerify(true);
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired");
            setIsVerified(false);
            onVerify(false);
          },
          "error-callback": () => {
            console.error("reCAPTCHA error");
            setIsVerified(false);
            onVerify(false);
          },
        });
      }
    }, 100);
  }, [onVerify]);

  useEffect(() => {
    if (window.grecaptcha) {
      renderRecaptcha();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
    script.async = true;
    script.defer = true;

    window.onRecaptchaLoad = () => {
      renderRecaptcha();
    };

    script.onerror = () => {
      console.error("Failed to load reCAPTCHA");
      onVerify(false);
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (window.onRecaptchaLoad) {
        delete window.onRecaptchaLoad;
      }
    };
  }, [onVerify, renderRecaptcha]);

  return (
    <div className="auth-captcha">
      <label className="auth-label">Security verification</label>
      <div className="auth-captcha-box">
        <div id="recaptcha-container"></div>
      </div>
      {isVerified && (
        <div className="auth-requirement met" style={{ marginTop: "0.5rem" }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Verified successfully
        </div>
      )}
    </div>
  );
}

export default Captcha;
