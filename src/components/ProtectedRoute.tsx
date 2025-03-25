import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from './ui/skeleton';

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

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Skeleton className="h-6 w-full max-w-md" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
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
