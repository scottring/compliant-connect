import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { QuestionBankProvider } from "./context/QuestionBankContext";
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
import Onboarding from "./pages/Onboarding";
import { useIsMobile } from "./hooks/use-mobile";
import { useState } from "react";
import UserSwitcher from "./components/UserSwitcher";
import AdminSettings from "@/pages/AdminSettings";

// Simplified CheckCompany component
const CheckCompany = () => {
  const { user } = useAuth();
  
  // If no user, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Render the children components
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
          <QuestionBankProvider>
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
                    {/* Onboarding route */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    
                    {/* Main Routes */}
                    <Route element={<MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}>
                      {/* Dashboard */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Routes that require company check */}
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
                        
                        {/* Admin Routes - temporarily removed permission check for MVP */}
                        {/* TODO: Re-enable permission check after MVP */}
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
            </TooltipProvider>
          </QuestionBankProvider>
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
