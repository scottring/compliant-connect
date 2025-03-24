
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import ProductSheets from "./pages/ProductSheets";
import ProductSheetDetail from "./pages/ProductSheetDetail";
import QuestionBank from "./pages/QuestionBank";
import Tags from "./pages/Tags";
import { Toaster } from "sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import Sidebar from "./components/Sidebar";
import useMobile from "./hooks/use-mobile";
import "./App.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  return (
    <AppProvider>
      <Router>
        <div className="flex h-screen overflow-hidden">
          <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main
              className={`flex-1 overflow-y-auto bg-background p-4 md:p-6 ${
                isMobile && sidebarOpen ? "opacity-50" : ""
              }`}
              onClick={() => {
                if (isMobile && sidebarOpen) {
                  setSidebarOpen(false);
                }
              }}
            >
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/suppliers/:id" element={<SupplierDetail />} />
                <Route path="/product-sheets" element={<ProductSheets />} />
                <Route path="/product-sheet/:id" element={<ProductSheetDetail />} />
                <Route path="/questions" element={<QuestionBank />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
        <ShadcnToaster />
      </Router>
    </AppProvider>
  );
}

export default App;
