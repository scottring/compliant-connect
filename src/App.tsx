import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import ProductSheets from "./pages/ProductSheets";
import SupplierProducts from "./pages/SupplierProducts";
import SupplierResponseForm from "./pages/SupplierResponseForm";
import QuestionBank from "./pages/QuestionBank";
import Tags from "./pages/Tags";
import NotFound from "./pages/NotFound";
import CustomerReview from "./pages/CustomerReview";
import Customers from "./pages/Customers";
import OurProducts from "./pages/OurProducts";
import Auth from "./pages/Auth";
import EmailConfirmation from "./components/EmailConfirmation";
import ProtectedRoute from "./components/ProtectedRoute";
import Unauthorized from "./pages/Unauthorized";
import CompanySelector from "./components/CompanySelector";
import AuthDebug from "./components/AuthDebug";
import LoadingDebug from "./components/LoadingDebug";
import AuthStateDebug from "./components/AuthStateDebug";
import Onboarding from "./pages/Onboarding";
import { useIsMobile } from "./hooks/use-mobile";
import { useState } from "react";
import UserSwitcher from "./components/UserSwitcher";
import AdminSettings from "@/pages/AdminSettings";

// Component to check if user has a company association
const CheckCompany = () => {
  const { userCompanies, loading, user } = useAuth();
  
  console.log("CheckCompany:", { 
    loading, 
    userLoggedIn: !!user, 
    companyCount: userCompanies.length,
    currentPath: window.location.pathname
  });
  
  // Wait until loading is done
  if (loading) {
    console.log("CheckCompany: Still loading");
    return <Outlet />;
  }
  
  // Check if user exists first
  if (!user) {
    console.log("CheckCompany: No user, redirecting to auth");
    return <Navigate to="/auth" replace />;
  }
  
  // TEMPORARILY DISABLED: Allow access to all routes even without companies
  // This allows us to test navigation after company creation
  /*
  // If user has no companies, redirect to onboarding
  if (userCompanies.length === 0) {
    console.log("CheckCompany: User has no companies, redirecting to onboarding");
    return <Navigate to="/onboarding" replace />;
  }
  */
  
  console.log("CheckCompany: User has companies or check bypassed, rendering children");
  // Otherwise, render the children
  return <Outlet />;
};

const queryClient = new QueryClient();

const App = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/email-confirmation" element={<EmailConfirmation />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  {/* Onboarding route - for users with no company */}
                  <Route path="/onboarding" element={<Onboarding />} />
                  
                  {/* Main Routes - including Dashboard */}
                  <Route element={<MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}>
                    {/* Dashboard - accessible to all authenticated users */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    
                    {/* The rest of routes in MainLayout */}
                    <Route element={<CheckCompany />}>
                      {/* Supplier Routes */}
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/suppliers/:id" element={<SupplierDetail />} />
                      <Route path="/supplier-products" element={<SupplierProducts />} />
                      <Route path="/supplier-response-form/:id" element={<SupplierResponseForm />} />
                      
                      {/* Customer Routes */}
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/customer-review/:id" element={<CustomerReview />} />
                      
                      {/* Product Routes */}
                      <Route path="/product-sheets" element={<ProductSheets />} />
                      <Route path="/product-sheets/:id" element={<SupplierResponseForm />} />
                      <Route path="/our-products" element={<OurProducts />} />
                      
                      {/* Admin Routes - require admin permissions */}
                      <Route element={<ProtectedRoute requiredPermission="admin:access" />}>
                        <Route path="/question-bank" element={<QuestionBank />} />
                        <Route path="/tags" element={<Tags />} />
                      </Route>
                    </Route>
                  </Route>
                </Route>
                
                {/* Admin Settings Route */}
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute requiredPermission="admin:access">
                      <AdminSettings />
                    </ProtectedRoute>
                  }
                />
                
                {/* Fallback Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* Debug Panels - visible in development mode */}
              {/* Removing debug panels as they're no longer needed */}
              {/* <AuthDebug />
              <LoadingDebug />
              <AuthStateDebug /> */}
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Extract the main layout into a separate component
const MainLayout = ({ 
  sidebarOpen, 
  setSidebarOpen 
}: { 
  sidebarOpen: boolean; 
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="flex-1 overflow-auto p-8">
        <div className="flex justify-between items-center mb-4">
          <CompanySelector />
          <UserSwitcher />
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default App;
