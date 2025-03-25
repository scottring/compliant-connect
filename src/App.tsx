
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
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
import { useIsMobile } from "./hooks/use-mobile";
import { useState } from "react";
import UserSwitcher from "./components/UserSwitcher";

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
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/email-confirmation" element={<EmailConfirmation />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/suppliers" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <Suppliers />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/suppliers/:id" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <SupplierDetail />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/customers" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <Customers />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/product-sheets" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <ProductSheets />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/product-sheets/:id" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <SupplierResponseForm />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/supplier-products" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <SupplierProducts />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/supplier-response-form/:id" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <SupplierResponseForm />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/customer-review/:id" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <CustomerReview />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/our-products" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <OurProducts />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/question-bank" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <QuestionBank />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/tags" element={
                  <ProtectedRoute>
                    <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <Tags />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Extract the main layout into a separate component
const MainLayout = ({ 
  children, 
  sidebarOpen, 
  setSidebarOpen 
}: { 
  children: React.ReactNode; 
  sidebarOpen: boolean; 
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="flex-1 overflow-auto p-8">
        <div className="flex justify-end mb-4">
          <UserSwitcher />
        </div>
        {children}
      </main>
    </div>
  );
};

export default App;
