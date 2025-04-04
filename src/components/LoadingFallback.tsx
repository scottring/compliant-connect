import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface LoadingFallbackProps {
  children: React.ReactNode;
  timeout?: number;
}

const LoadingFallback = ({ children, timeout = 5000 }: LoadingFallbackProps) => {
  const { loading, user } = useAuth();

  useEffect(() => {
    // If loading continues for too long, force it to stop
    const timer = setTimeout(() => {;
      // Access the AuthContext state directly through the DOM
      const authProviderElement = document.getElementById('auth-provider');
      if (authProviderElement) {
        // Set a data attribute to signal the loading state should be forced to false
        authProviderElement.setAttribute('data-force-loaded', 'true');
      }
      // Force a page refresh as a last resort
      window.location.reload();
    }, timeout);

    // Clean up timer
    return () => clearTimeout(timer);
  }, [timeout]);

  return <>{children}</>;
};

export default LoadingFallback; 