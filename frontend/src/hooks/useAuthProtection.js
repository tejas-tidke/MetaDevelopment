import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Custom hook to protect routes from unauthorized access
export const useAuthProtection = (redirectTo = '/login') => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate(redirectTo, { replace: true });
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [navigate, redirectTo]);

  return null;
};

// Custom hook to redirect authenticated users away from public pages
export const useRedirectIfAuthenticated = (redirectTo = '/welcome') => {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is authenticated, redirect to specified page
        navigate(redirectTo, { replace: true });
        return;
      }
      setIsCheckingAuth(false);
    });

    return () => {
      unsubscribe();
    };
  }, [navigate, redirectTo]);

  return isCheckingAuth;
};
