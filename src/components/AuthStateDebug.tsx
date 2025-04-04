import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { shouldEnableDebugTools } from "@/config/env";

// Component to display authentication state debug information
const AuthStateDebug = () => {
  const { user, session, loading, userCompanies } = useAuth();
  const [renderCount, setRenderCount] = useState(0);
  const [authChecks, setAuthChecks] = useState({
    initialLoginChecked: false,
    sessionEstablished: false,
    profileLoaded: false,
    companiesLoaded: false,
  });

  // Track render count to see if the component is updating
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, [user, session, loading]);

  // Update auth check states when data changes
  useEffect(() => {
    setAuthChecks({
      initialLoginChecked: true,
      sessionEstablished: !!session,
      profileLoaded: !!(user?.profile),
      companiesLoaded: userCompanies.length > 0,
    });
  }, [user, session, userCompanies]);

  // Only show in development and if debug tools are enabled
  if (!shouldEnableDebugTools()) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '70px',
        right: '10px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}
    >
      <div className="flex justify-between items-center">
        <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Auth State Debug</h3>
        <span style={{ color: '#aaa' }}>(Render #{renderCount})</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>Loading:</strong> <span style={{ color: loading ? 'orange' : 'lightgreen' }}>{loading ? 'Yes' : 'No'}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>Session:</strong> <span style={{ color: session ? 'lightgreen' : 'pink' }}>{session ? 'Active' : 'None'}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>User:</strong> <span style={{ color: user ? 'lightgreen' : 'pink' }}>{user ? user.email : 'Not logged in'}</span>
      </div>
      
      <div style={{ marginBottom: '5px' }}>
        <strong>Profile:</strong> <span style={{ color: user?.profile ? 'lightgreen' : 'pink' }}>
          {user?.profile ? `${user.profile.first_name} ${user.profile.last_name}` : 'Missing'}
        </span>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Companies:</strong> <span style={{ color: userCompanies.length > 0 ? 'lightgreen' : 'pink' }}>
          {userCompanies.length} {userCompanies.length === 1 ? 'company' : 'companies'}
        </span>
      </div>
      
      <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '5px' }}>
        <strong>Auth Flow Checks:</strong>
        <div>
          {Object.entries(authChecks).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
              <span>{key}:</span> 
              <span style={{ color: value ? 'lightgreen' : 'pink' }}>{value ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      </div>
      
      {loading && (
        <button
          onClick={() => {
            const authProvider = document.getElementById('auth-provider');
            if (authProvider) {
              authProvider.dataset.forceLoaded = 'true';
              // Refresh after a short delay
              setTimeout(() => window.location.reload(), 500);
            }
          }}
          style={{
            backgroundColor: 'red',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            marginTop: '10px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Force Stop Loading
        </button>
      )}
    </div>
  );
};

export default AuthStateDebug; 