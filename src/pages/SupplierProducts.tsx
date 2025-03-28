import React, { useState, useEffect, useCallback } from "react";
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
// Progress might not be available directly on PIR, remove if not needed
// import { Progress } from "@/components/ui/progress"; 
import { format } from "date-fns";
import { Search, Filter, Eye, ClipboardCheck, FileSpreadsheet, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase"; // Correct client import
import RequestSheetModal from "@/components/suppliers/RequestSheetModal";
import { PIRStatus } from "@/types/pir"; // Correct import path

// Define the PIR display type
interface PirDisplayData {
  id: string;
  productName: string;
  supplierId: string;
  supplierName?: string;
  customerId: string; 
  updatedAt: string;
  status: PIRStatus; 
}

// Define the database record type for the query result
interface PirRequestRecord {
  id: string;
  customer_id: string;
  updated_at: string;
  status: PIRStatus;
  // Adjust products and companies to handle potential arrays from Supabase joins
  products: { 
    name: string;
    supplier_id: string;
    companies: { 
      name: string;
    }[] | { // companies could be an array
      name: string;
    } | null; 
  }[] | { // products could be an array
    name: string;
    supplier_id: string;
    companies: { 
      name: string;
    }[] | {
      name: string;
    } | null; 
  } | null; 
  [key: string]: any; 
}

const SupplierProducts = () => {
  const { user, currentCompany } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [pirRequests, setPirRequests] = useState<PirDisplayData[]>([]); 
  const [filteredPirs, setFilteredPirs] = useState<PirDisplayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  // These might not be needed if modal fetches suppliers itself
  // const [selectedSupplierId, setSelectedSupplierId] = useState<string>(""); 
  // const [selectedSupplierName, setSelectedSupplierName] = useState<string>("");
  const navigate = useNavigate();
  
  // Load PIR Requests from Supabase
  const loadPirRequests = useCallback(async () => { 
    if (!user?.id || !currentCompany?.id) return;
    
    setLoading(true);
    try {
      // Query pir_requests and join related product/company names
      const { data: pirData, error: pirError } = await supabase
        .from('pir_requests')
        .select(`
          id,
          customer_id,
          updated_at,
          status,
          products (
            name,
            supplier_id,
            companies ( name ) 
          )
        `) 
        .eq('customer_id', currentCompany.id); // Filter by customer_id
        
      if (pirError) {
        console.error('Error loading PIR requests:', pirError);
        toast.error('Failed to load Product Information Requests');
        return;
      }
      
      if (!pirData || pirData.length === 0) {
        setPirRequests([]); 
        return;
      }
      
      // Transform data, safely handling potential arrays for products and companies
      const transformedPirs: PirDisplayData[] = (pirData as PirRequestRecord[]).map(pir => {
        const product = Array.isArray(pir.products) ? pir.products[0] : pir.products;
        const company = Array.isArray(product?.companies) ? product?.companies[0] : product?.companies;

        return {
          id: pir.id,
          productName: product?.name || 'Unknown Product',
          supplierId: product?.supplier_id || 'unknown',
          supplierName: company?.name || 'Unknown Supplier', 
          customerId: pir.customer_id,
          updatedAt: pir.updated_at,
          status: pir.status || 'draft' 
        };
      });
      
      setPirRequests(transformedPirs); 
      
    } catch (err) {
      console.error('Unexpected error loading PIR requests:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany]); // Dependencies are correct

  useEffect(() => {
    loadPirRequests(); // Correct function call
  }, [loadPirRequests]); // Depend on the memoized function

  // Filter PIRs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPirs(pirRequests); 
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    const filtered = pirRequests.filter(pir => 
      pir.productName.toLowerCase().includes(searchTermLower) ||
      pir.supplierName?.toLowerCase().includes(searchTermLower)
    );
    
    setFilteredPirs(filtered); 
  }, [pirRequests, searchTerm]);

  // Adjust handleAction to use PIR ID and potentially different routes
  const handleAction = (pirId: string, action: string) => {
    if (action === "edit") {
      navigate(`/supplier-response-form/${pirId}`); 
    } else if (action === "review") {
      navigate(`/customer-review/${pirId}`);
    }
  };

  const handleRequestSheet = async () => {
    setIsRequestModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Information Requests" // Updated Title
        subtitle={currentCompany ? `Viewing requests for ${currentCompany.name}` : "All Requests"} // Updated Subtitle
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
      ) : filteredPirs.length > 0 ? ( // Use filteredPirs
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Supplier Name</TableHead>
                {/* <TableHead>Progress</TableHead> */} {/* Removed Progress */}
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPirs.map((pir) => ( // Use filteredPirs
                <TableRow key={pir.id}>
                  <TableCell className="font-medium">{pir.productName}</TableCell>
                  <TableCell>{pir.supplierName}</TableCell>
                  {/* Progress removed */}
                  <TableCell>
                    {pir.updatedAt 
                      ? format(new Date(pir.updatedAt), "yyyy-MM-dd") 
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                     {/* Adjust status display based on PIRStatus enum */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pir.status === 'approved' ? 'bg-green-100 text-green-800' : // Use 'approved' for green
                      pir.status === 'in_review' ? 'bg-blue-100 text-blue-800' : // Use 'in_review' for blue
                      pir.status === 'draft' ? 'bg-gray-100 text-gray-800' : 
                      'bg-yellow-100 text-yellow-800' // Default for pending, rejected, revision_requested
                    }`}>
                      {pir.status.charAt(0).toUpperCase() + pir.status.slice(1)} {/* Simple capitalization */}
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
                         {/* Pass pir.id to handleAction */}
                        <DropdownMenuItem onClick={() => handleAction(pir.id, "review")}>
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction(pir.id, "edit")}>
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
            <h3 className="text-lg font-semibold">No Product Information Requests Found</h3> {/* Updated text */}
            <p className="text-muted-foreground mb-4">
              You haven't requested any product information from your suppliers yet. {/* Updated text */}
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
        // Modal fetches its own suppliers now
        // supplierId={selectedSupplierId || undefined} 
        // supplierName={selectedSupplierName || undefined}
      />
    </div>
  );
};

export default SupplierProducts;
