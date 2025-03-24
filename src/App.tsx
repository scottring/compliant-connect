
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import ProductSheets from "./pages/ProductSheets";
import SupplierProducts from "./pages/SupplierProducts";
import SupplierPIRResponse from "./pages/SupplierPIRResponse";
import QuestionBank from "./pages/QuestionBank";
import Tags from "./pages/Tags";
import NotFound from "./pages/NotFound";
import { useIsMobile } from "./hooks/use-mobile";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex h-screen w-full overflow-hidden">
              <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
              <main className="flex-1 overflow-auto p-8">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/suppliers/:id" element={<SupplierDetail />} />
                  <Route path="/customers" element={<NotFound />} />
                  <Route path="/product-sheets" element={<ProductSheets />} />
                  <Route path="/supplier-products" element={<SupplierProducts />} />
                  <Route path="/supplier-sheet-request/:id" element={<SupplierPIRResponse />} />
                  <Route path="/our-products" element={<NotFound />} />
                  <Route path="/question-bank" element={<QuestionBank />} />
                  <Route path="/tags" element={<Tags />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
};

export default App;
