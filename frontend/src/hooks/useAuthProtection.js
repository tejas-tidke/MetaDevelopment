import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { checkAuthAndRedirect } from '../services/authService';

// Custom hook to protect routes from unauthorized access
export const useAuthProtection = (redirectTo = '/login') => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // If user is not authenticated, redirect to specified page
        checkAuthAndRedirect();
        navigate(redirectTo, { replace: true });
      }
    });

    // Handle browser back/forward navigation
    const handlePopState = () => {
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          checkAuthAndRedirect();
          navigate(redirectTo, { replace: true });
        }
      });
    };

    window.addEventListener('popstate', handlePopState);

    
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, redirectTo]);

  return null;
};

// Custom hook to redirect authenticated users away from public pages
export const useRedirectIfAuthenticated = (redirectTo = '/welcome') => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is authenticated, redirect to specified page
        navigate(redirectTo, { replace: true });
      }
    });

    const handlePopState = () => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          navigate(redirectTo, { replace: true });
        }
      });
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, redirectTo]);

  return null;
};