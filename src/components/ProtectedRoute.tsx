import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription } from './ui/alert';

interface ProtectedRouteProps {
  requiredPermission?: string;
  redirectTo?: string;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  redirectTo = '/auth',
  children,
}) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('ProtectedRoute: Loading timeout reached');
        setError('Authentication check timed out. Please try refreshing the page.');
        setTimeoutReached(true);
      }
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [loading]);

  // Debug log the protected route state
  useEffect(() => {
    console.log('ProtectedRoute state:', { 
      loading, 
      timeoutReached, 
      user: user?.email || 'null',
      path: location.pathname
    });
  }, [loading, timeoutReached, user, location.pathname]);

  // Show loading state while checking authentication
  if (loading && !timeoutReached) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-6 w-full max-w-md" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Show error if timeout reached but user exists
  if (timeoutReached && user) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // If loading timed out or user is null after timeout, redirect to login
  if (timeoutReached || !user) {
    console.log('ProtectedRoute: Redirecting to login', { timeoutReached, userExists: !!user });
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If permission is required but user doesn't have it, redirect
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Render children if provided, otherwise render Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
