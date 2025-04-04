import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useCompanyData } from '@/hooks/use-company-data'; // Import company data hook

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
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const { currentCompany, userCompanies, isLoadingCompanies } = useCompanyData(); // Get company data
  const location = useLocation();

  // Show loading indicator while auth or company data is loading
  // Important to wait for company data before checking permissions
  if (authLoading.auth || isLoadingCompanies) {
    // TODO: Replace with a proper loading spinner/component
    return <div>Loading...</div>;
  }

  // If no user after loading, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check permissions if required
  if (requiredPermission) {
    let hasRequiredPermission = false;
    if (currentCompany && userCompanies) {
        const currentUserCompany = userCompanies.find(uc => uc.id === currentCompany.id);
        const userRole = currentUserCompany?.userRole;

        // Implement permission logic (example: admin/owner has admin access)
        if (requiredPermission === "admin:access") {
            hasRequiredPermission = userRole === 'admin' || userRole === 'owner';
        }
        // Add other permission checks here based on userRole and requiredPermission string
    }

    if (!hasRequiredPermission) {
        // Redirect to an unauthorized page or back to dashboard/home
        return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated, render children or outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
