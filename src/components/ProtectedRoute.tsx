import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  requiredPermission?: string;
  redirectTo?: string;
  children?: React.ReactNode;
}

// Simplified ProtectedRoute component that doesn't rely on loading states
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  redirectTo = '/auth',
  children,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  // If no user, redirect to login
  if (!user) {
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // For MVP: Temporarily bypass role check to ensure access to all pages
  // TODO: Re-enable proper permission checking after MVP
  // if (requiredPermission && user.role !== 'admin') {
  //   return <Navigate to="/unauthorized" replace />;
  // }

  // User is authenticated, render children or outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
