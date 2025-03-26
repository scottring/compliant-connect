import React, { useState, useEffect } from "react";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Search, Filter, Eye, ClipboardCheck, FileSpreadsheet, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RequestSheetModal from "@/components/suppliers/RequestSheetModal";

// Define the product sheet type based on database structure
interface ProductSheet {
  id: string;
  name: string;
  supplierId: string;
  supplierName?: string;
  requestedById: string;
  progress: number;
  updatedAt: string;
  status: string;
}

// Define the database record type
interface ProductSheetRecord {
  id: string;
  name: string;
  supplier_id: string;
  requested_by_id: string;
  updated_at: string;
  status?: string;
  companies?: { name: string };
  [key: string]: any; // Allow for additional fields that may exist
}

const SupplierProducts = () => {
  const { user, currentCompany } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [productSheets, setProductSheets] = useState<ProductSheet[]>([]);
  const [filteredSheets, setFilteredSheets] = useState<ProductSheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>("");
  const navigate = useNavigate();
  
  // Load product sheets from Supabase
  useEffect(() => {
    const loadProductSheets = async () => {
      if (!user?.id || !currentCompany?.id) return;
      
      setLoading(true);
      try {
        // Fetch product sheets that were requested by the current company
        const { data, error } = await supabase
          .from('product_sheets')
          .select(`
            *,
            companies:supplier_id (name)
          `)
          .eq('requested_by_id', currentCompany.id);
          
        if (error) {
          console.error('Error loading product sheets:', error);
          toast.error('Failed to load product sheets');
          return;
        }
        
        if (!data || data.length === 0) {
          setProductSheets([]);
          return;
        }
        
        // Transform data to match our interface
        const transformedSheets: ProductSheet[] = (data as ProductSheetRecord[]).map(sheet => ({
          id: sheet.id,
          name: sheet.name,
          supplierId: sheet.supplier_id,
          supplierName: sheet.companies?.name || 'Unknown Supplier',
          requestedById: sheet.requested_by_id,
          // Use a default progress of 0 for now
          progress: 0,
          updatedAt: sheet.updated_at,
          status: sheet.status || 'pending'
        }));
        
        setProductSheets(transformedSheets);
        
      } catch (err) {
        console.error('Unexpected error loading product sheets:', err);
        toast.error('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    loadProductSheets();
  }, [user, currentCompany]);

  // Filter product sheets based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSheets(productSheets);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    const filtered = productSheets.filter(sheet => 
      sheet.name.toLowerCase().includes(searchTermLower) ||
      sheet.supplierName?.toLowerCase().includes(searchTermLower)
    );
    
    setFilteredSheets(filtered);
  }, [productSheets, searchTerm]);

  const handleAction = (sheetId: string, action: string) => {
    if (action === "edit") {
      navigate(`/supplier-response-form/${sheetId}`);
    } else if (action === "review") {
      navigate(`/customer-review/${sheetId}`);
    }
  };

  const handleRequestSheet = async () => {
    // Simply open the modal, supplier selection is now handled inside the modal
    setIsRequestModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Suppliers' Product Sheets"
        subtitle={currentCompany ? `Viewing as ${currentCompany.name}` : "All Product Sheets"}
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting data...")}
            />
            <PageHeaderAction
              label="Request New Sheet"
              onClick={handleRequestSheet}
            />
          </>
        }
      />

      <div className="flex justify-between items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or supplier"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredSheets.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSheets.map((sheet) => (
                <TableRow key={sheet.id}>
                  <TableCell className="font-medium">{sheet.name}</TableCell>
                  <TableCell>{sheet.supplierName}</TableCell>
                  <TableCell>
                    <Progress value={sheet.progress} className="h-2 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    {sheet.updatedAt 
                      ? format(new Date(sheet.updatedAt), "yyyy-MM-dd") 
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sheet.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sheet.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sheet.status === 'completed' ? 'Completed' :
                       sheet.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          size="sm"
                        >
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleAction(sheet.id, "review")}>
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(sheet.id, "edit")}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No product sheets found</h3>
            <p className="text-muted-foreground mb-4">
              You haven't requested any product sheets from your suppliers yet.
            </p>
            <Button onClick={handleRequestSheet} className="gap-2">
              <Plus className="h-4 w-4" />
              Request New Sheet
            </Button>
          </div>
        </div>
      )}

      {/* Request Sheet Modal */}
      <RequestSheetModal
        open={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        // Optionally pass pre-selected supplier if we have it
        supplierId={selectedSupplierId || undefined}
        supplierName={selectedSupplierName || undefined}
      />
    </div>
  );
};

export default SupplierProducts;
