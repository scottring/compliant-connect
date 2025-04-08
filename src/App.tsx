import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { QuestionBankProvider } from "./context/QuestionBankContext";
import { useCompanyData } from "./hooks/use-company-data";
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
import CustomerDetail from "./pages/CustomerDetail"; // Assuming this is the detail page component

import OurProducts from "./pages/OurProducts";
import Auth from "./pages/Auth";
import EmailConfirmation from "./components/EmailConfirmation";
import ProtectedRoute from "./components/ProtectedRoute";
import InvitationConfirm from "./pages/InvitationConfirm";
import InviteRegistration from "./pages/InviteRegistration"; // Import the new registration page
import Unauthorized from "@/pages/Unauthorized.tsx"; // Use path alias instead of relative path
import CompanySelector from "./components/CompanySelector";
import Onboarding from "./pages/Onboarding";
import { useIsMobile } from "./hooks/use-mobile";
import { useState, useEffect } from "react";
import UserSwitcher from "./components/UserSwitcher";
import AdminSettings from "@/pages/AdminSettings";
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'

// Simplified CheckCompany component
const CheckCompany = () => {
  const { user, loading: authLoading } = useAuth();
  const { userCompanies, isLoadingCompanies, errorCompanies } = useCompanyData();
  const location = useLocation();

  // Show loading state while checking auth or company data
  if (authLoading.auth || isLoadingCompanies) {
    return <div>Loading user data...</div>;
  }

  // If no user after loading, redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user exists but has no companies after loading, redirect to onboarding
  if (!isLoadingCompanies && (!userCompanies || userCompanies.length === 0)) {
    // Prevent redirect loop if already on onboarding
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }
  }

  // If there was an error loading companies, show an error message or redirect
  if (errorCompanies) {
    return <div>Error loading company information. Please try again later.</div>;
  }

  return <><Outlet /></>;
};

const queryClient = new QueryClient();

const App = () => {
  const { toast } = useToast()
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <QuestionBankProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/email-confirmation" element={<EmailConfirmation />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/invitation/confirm" element={<InvitationConfirm />} /> {/* Old confirmation route */}
                    <Route path="/invite/register" element={<InviteRegistration />} /> {/* New registration route */}
                    
                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                      {/* Onboarding route */}
                      <Route path="/onboarding" element={<Onboarding />} />
                      
                      {/* Main Routes */}
                      <Route element={<MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}>
                        {/* Dashboard */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        
                        {/* Routes that require company check */}
                        <Route element={<CheckCompany />}>
                          <Route path="/admin/settings" element={<AdminSettings />} /> {/* Add route for Admin Settings */}
                          {/* Supplier Routes */}
                          <Route path="/suppliers" element={<Suppliers />} />
                          <Route path="/suppliers/:id" element={<SupplierDetail />} />
                          <Route path="/supplier-products" element={<SupplierProducts />} />
                          <Route path="/supplier-response-form/:id" element={<SupplierResponseForm />} />
                          
                          {/* Customer Routes */}
                          <Route path="/customers" element={<Customers />} />
                          <Route path="/customer-review/:id" element={<CustomerReview />} />
                          <Route path="/customer/:id" element={<CustomerDetail />} /> {/* Added Customer Detail Route */}
                          
                          {/* Product Routes */}
                          <Route path="/product-sheets" element={<ProductSheets />} />
                          <Route path="/product-sheets/:id" element={<SupplierResponseForm />} />
                          <Route path="/our-products" element={<OurProducts />} />
                          
                          {/* Admin Routes */}
                          <Route path="/question-bank" element={<QuestionBank />} />
                          <Route path="/tags" element={<Tags />} />
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
                </BrowserRouter>
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </QuestionBankProvider>
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </>
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
      <main className="flex-1 overflow-auto p-10"> {/* Increased padding */}
        <div className="flex justify-between items-center mb-8"> {/* Increased bottom margin */}
          <CompanySelector />
          {/* <UserSwitcher /> Removed */}
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default App;
