import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

const LoadingDebug = () => {
  const { loading, user } = useAuth();
  const [startTime, setStartTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (loading && startTime === null) {
      setStartTime(Date.now());
    } else if (!loading && startTime !== null) {
      setDuration(Date.now() - startTime);
      setStartTime(null);
    } else if (loading && startTime !== null) {
      // Update the duration every second while loading
      const interval = setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loading, startTime]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
      }}
    >
      <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
      <div><strong>User:</strong> {user ? user.email : 'Not logged in'}</div>
      <div><strong>Duration:</strong> {loading ? `${Math.round(duration / 1000)}s` : `${Math.round(duration / 1000)}s (done)`}</div>
      {loading && duration > 5000 && (
        <button 
          onClick={() => {
            // Force loading to stop
            const authProvider = document.getElementById('auth-provider');
            if (authProvider) {
              authProvider.dataset.forceLoaded = 'true';
              // Refresh
              window.location.reload();
            }
          }}
          style={{
            backgroundColor: 'red',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            marginTop: '5px',
            cursor: 'pointer',
          }}
        >
          Force Stop Loading
        </button>
      )}
    </div>
  );
};

export default LoadingDebug; 