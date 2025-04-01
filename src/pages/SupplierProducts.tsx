import React, { useState, useEffect, useCallback } from "react";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Search, Filter, Eye, ClipboardCheck, FileSpreadsheet, Plus } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext"; // Keep for user
import { useCompanyData } from "@/hooks/use-company-data"; // Use for company context
import { supabase } from "@/integrations/supabase/client";
import RequestSheetModal from "@/components/suppliers/RequestSheetModal";
import { PIRStatus } from "@/types/pir";
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import query hooks

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

// Define the database record type for the query result - Adjusted for potential arrays
interface PirRequestRecord {
  id: string;
  customer_id: string;
  updated_at: string;
  status: PIRStatus;
  products: { // products might be an object or null
    name: string;
    supplier_id: string;
    companies: { name: string; } | null; // companies might be an object or null
  } | null;
}

// Type guard to check if the nested structure exists
function hasNestedData(pir: any): pir is PirRequestRecord {
    return pir && typeof pir === 'object' && pir.products && typeof pir.products === 'object';
}


const SupplierProducts = () => {
  const { user } = useAuth(); // Keep for user check if needed
  const { currentCompany, isLoadingCompanies } = useCompanyData(); // Use new hook
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPirs, setFilteredPirs] = useState<PirDisplayData[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Load PIR Requests using React Query
  const fetchPirRequests = useCallback(async (customerId: string): Promise<PirDisplayData[]> => {
    // Fetch data with potentially nested arrays/objects
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
      .eq('customer_id', customerId);

    if (pirError) {
      console.error('Error loading PIR requests:', pirError);
      throw new Error(`Failed to load Product Information Requests: ${pirError.message}`);
    }
    if (!pirData) return [];

    // Transform data, safely handling potential arrays/nulls
    const transformedPirs: PirDisplayData[] = pirData.map((pir: any) => { // Use any initially for flexibility
        // Safely access nested properties
        const product = pir.products; // products might be null or object
        const company = product?.companies; // companies might be null or object

        return {
            id: pir.id,
            productName: product?.name ?? 'Unknown Product',
            supplierId: product?.supplier_id ?? 'unknown',
            supplierName: company?.name ?? 'Unknown Supplier',
            customerId: pir.customer_id,
            updatedAt: pir.updated_at,
            status: pir.status || 'draft'
        };
    });
    return transformedPirs;
  }, []); // No dependencies needed for the fetch function itself

  const {
    data: pirRequests, // Data returned by the query
    isLoading: loadingPirs, // Loading state from the query
    error: errorPirs, // Error state from the query
    refetch: refetchPirs, // Function to refetch
  } = useQuery<PirDisplayData[], Error>({
    queryKey: ['pirRequests', currentCompany?.id], // Query key depends on current company
    queryFn: () => fetchPirRequests(currentCompany!.id),
    enabled: !!currentCompany, // Only run if a company is selected
    staleTime: 1 * 60 * 1000, // Example: 1 minute stale time
    gcTime: 5 * 60 * 1000, // Example: 5 minutes cache time
  });

  // Filter PIRs based on search term (runs when pirRequests data or searchTerm changes)
  useEffect(() => {
    const currentPirs = pirRequests ?? []; // Use empty array if data is undefined
    if (!searchTerm.trim()) {
      setFilteredPirs(currentPirs);
      return;
    }
    const searchTermLower = searchTerm.toLowerCase();
    const filtered = currentPirs.filter(pir =>
      pir.productName.toLowerCase().includes(searchTermLower) ||
      (pir.supplierName && pir.supplierName.toLowerCase().includes(searchTermLower)) // Add null check for supplierName
    );
    setFilteredPirs(filtered);
  }, [pirRequests, searchTerm]);

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

  // Combine loading states
  const isLoading = isLoadingCompanies || loadingPirs;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Information Requests"
        subtitle={currentCompany ? `Viewing requests for ${currentCompany.name}` : "Select a company"}
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting data...")}
              disabled={isLoading} // Disable if loading anything
            />
            <PageHeaderAction
              label="Request New Sheet"
              onClick={handleRequestSheet}
              disabled={isLoading || !currentCompany} // Disable if loading or no company
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
            disabled={isLoading} // Disable search while loading
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {isLoading ? ( // Combined loading state
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : errorPirs ? ( // Handle PIR query error state
         <div className="border rounded-md p-8 text-center text-red-500">
            Error loading requests: {errorPirs.message}
         </div>
      ) : filteredPirs.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPirs.map((pir) => (
                <TableRow key={pir.id}>
                  <TableCell className="font-medium">{pir.productName}</TableCell>
                  <TableCell>{pir.supplierName}</TableCell>
                  <TableCell>
                    {pir.updatedAt ? format(new Date(pir.updatedAt), "yyyy-MM-dd") : "N/A"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pir.status === 'approved' ? 'bg-green-100 text-green-800' :
                      pir.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                      pir.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pir.status.charAt(0).toUpperCase() + pir.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
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
            <h3 className="text-lg font-semibold">
                {currentCompany ? 'No Product Information Requests Found' : 'Please select a company'}
            </h3>
            {currentCompany && (
                <>
                    <p className="text-muted-foreground mb-4">
                      You haven't requested any product information yet.
                    </p>
                    <Button onClick={handleRequestSheet} className="gap-2" disabled={isLoading}>
                      <Plus className="h-4 w-4" />
                      Request New Sheet
                    </Button>
                </>
            )}
          </div>
        </div>
      )}

      {/* Request Sheet Modal */}
      <RequestSheetModal
        open={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
      />
    </div>
  );
};

export default SupplierProducts;
