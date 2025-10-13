import React, { useState, useEffect } from "react";

function Captcha({ onVerify }) {
  const [isVerified, setIsVerified] = useState(false);

  // Load reCAPTCHA script
  useEffect(() => {
    // Check if reCAPTCHA is already loaded
    if (window.grecaptcha) {
      // Render the reCAPTCHA widget
      renderRecaptcha();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    
    // Global callback function for when reCAPTCHA loads
    window.onRecaptchaLoad = () => {
      renderRecaptcha();
    };
    
    script.onerror = () => {
      console.error('Failed to load reCAPTCHA');
      onVerify(false);
    };
    
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      // Remove global callback
      if (window.onRecaptchaLoad) {
        delete window.onRecaptchaLoad;
      }
    };
  }, [onVerify]);

  // Render reCAPTCHA widget
  const renderRecaptcha = () => {
    if (!window.grecaptcha) return;
    
    // Wait a bit for grecaptcha to be fully ready
    setTimeout(() => {
      const container = document.getElementById('recaptcha-container');
      if (container && !container.hasChildNodes()) {
        window.grecaptcha.render('recaptcha-container', {
          'sitekey': '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
          'callback': (token) => {
            console.log('reCAPTCHA verified with token:', token);
            setIsVerified(true);
            onVerify(true);
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
            setIsVerified(false);
            onVerify(false);
          },
          'error-callback': () => {
            console.error('reCAPTCHA error');
            setIsVerified(false);
            onVerify(false);
          }
        });
      }
    }, 100);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Security Verification
      </label>
      <div id="recaptcha-container" className="mb-2"></div>
      {isVerified && (
        <div className="flex items-center text-sm text-green-600">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Verified successfully
        </div>
      )}
    </div>
  );
}

export default Captcha;