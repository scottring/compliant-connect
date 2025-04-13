import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
// Remove useApp import as it's not providing the needed data
// import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, Plus, PackageOpen, Inbox, Eye, SendHorizontal } from "lucide-react"; // Added Eye, SendHorizontal
import { toast } from "sonner";
// Remove ProductSheet type if not used directly anymore
// import { ProductSheet } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { PirRequest, Company } from "../types/index"; // Explicitly importing from index file
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import query hooks

const SupplierIncomingRequests = () => { // Renamed from OurProducts
  const { user } = useAuth(); // Get user from AuthContext
  // Log initial render
  const [companyId, setCompanyId] = useState<string | null>(null);
  // Removed useState for incomingPirs and isLoading, managed by useQuery now
  // const [incomingPirs, setIncomingPirs] = useState<PirRequest[]>([]);
  const [requestingCompanies, setRequestingCompanies] = useState<Company[]>([]); // Keep if needed elsewhere, or remove
  // const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending"); // Default tab for suppliers
  const navigate = useNavigate();

  // 1. Fetch the user's company ID
  useEffect(() => {
    // This effect now ONLY fetches the company ID and doesn't manage the main loading state
    const fetchCompanyId = async () => {
      if (user) {
        // setIsLoading(true); // Removed: Loading managed by PIR fetch effect
        try {
          const { data, error } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            // .single(); // Removed .single() to check the array directly

          // Log raw data
          if (error) {
            toast.error("Could not determine your company association.");
            setCompanyId(null);
          } else if (data && data.length > 0 && data[0].company_id) {
            // Check if data is an array, has elements, and the first element has company_id
            const foundCompanyId = data[0].company_id;
            setCompanyId(foundCompanyId);
            } else {
            // Handle case where data is null, empty array, or row has no company_id
            setCompanyId(null);
          }
        } catch (err) {
          toast.error("An error occurred while identifying your company.");
          setCompanyId(null);
        }
        // setIsLoading(false); // Removed: Loading managed by PIR fetch effect
      } else {
        setCompanyId(null);
        // setIsLoading(false); // Removed: Loading managed by PIR fetch effect
      }
    };
    fetchCompanyId();
  }, [user]);

  // 2. Fetch incoming PIRs using useQuery
  const fetchIncomingPirs = useCallback(async (supplierCompanyId: string): Promise<PirRequest[]> => {
    if (!supplierCompanyId) return []; // Don't fetch if no company ID

    const { data: pirsData, error: pirsError } = await supabase
      .from('pir_requests')
      .select(`
        *,
        customer:companies!pir_requests_customer_id_fkey(*),
        product:products(*)
      `)
      .eq('supplier_company_id', supplierCompanyId);

    if (pirsError) {
      toast.error("Failed to load incoming requests.");
      console.error("PIR Fetch Error:", pirsError);
      throw new Error(pirsError.message); // Throw error for useQuery
    }

    // Process fetched data
    const processedPirs = (pirsData || []).map((pir: any) => ({
      ...pir,
      productName: pir.product?.name ?? pir.suggested_product_name ?? 'Unknown Product',
      customerName: pir.customer?.name ?? 'Unknown Customer',
    }));
    return processedPirs;
  }, []); // useCallback ensures function identity doesn't change unnecessarily

  const {
    data: incomingPirs = [], // Default to empty array
    isLoading, // Use loading state from useQuery
    error: fetchError, // Use error state from useQuery
    refetch: refetchPirs, // Function to manually refetch
  } = useQuery<PirRequest[], Error>({
    queryKey: ['incomingPirs', companyId], // Query key includes companyId
    queryFn: () => fetchIncomingPirs(companyId!), // Call fetch function
    enabled: !!companyId, // Only run query if companyId is available
    staleTime: 1 * 60 * 1000, // Example: 1 minute stale time
    gcTime: 5 * 60 * 1000, // Example: 5 minutes cache time
  });

  // --- Helper Functions --- Moved Up ---
  // Removed getCompanyName as customer name is now directly on the pir object
  // const getCompanyName = (customerId: string | null): string => {
  //   if (!customerId) return "Unknown Customer";
  //   const company = requestingCompanies.find(c => c.id === customerId);
  //   return company ? company.name : "Loading..."; // Or "Unknown ID"
  // };
  // --- Helper Functions --- Moved Up --- // Keep this comment structure if needed
  // Removed getCompanyName helper as customerName is directly on the pir object from processing

  // --- Filtering Logic (Restored) ---
  const getFilteredPirs = () => {
    // Log filter start
    let pirsToFilter = incomingPirs;

    // Adjust filtering based on tabs (e.g., 'pending', 'completed')
    if (activeTab === "pending") {
      // Pending tab should show statuses requiring supplier action or waiting for customer review
      pirsToFilter = incomingPirs.filter(pir => ['sent', 'in_progress', 'submitted', 'rejected', 'resubmitted', 'draft'].includes(pir.status));
    } else if (activeTab === "completed") { // Completed tab should show 'reviewed' (Approved) and possibly 'canceled'
      pirsToFilter = incomingPirs.filter(pir => ['reviewed', 'canceled'].includes(pir.status));
    }
    // Add more statuses or 'all' tab as needed

    // Apply search term
    const result = pirsToFilter.filter(pir => // Assign to result
      pir.request_details?.toLowerCase().includes(searchTerm.toLowerCase()) || // Search details
      pir.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) // Search customer name directly
      // Add more searchable fields if needed (e.g., product name if available)
    );
    // Log filter result using the correct variable
    return result; // Return the correct variable
  };

  const filteredPirs = getFilteredPirs();

  // --- Helper Functions --- (Moved getCompanyName above getFilteredPirs)

  // --- Event Handlers ---
   const handlePirAction = (pir: PirRequest) => {
     // Navigate to the PIR response form
     navigate(`/supplier-response-form/${pir.id}`);
   };

  // --- Rendering Logic (Restored) ---
  // Log final state before rendering main content
  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Requests" // Updated Title
        description="Review and respond to Product Information Requests from your customers" // Updated Description
        // Removed "Add Product" action for suppliers on this page
      />

      {/* Display loading state from useQuery */}
      {isLoading && !fetchError && <p>Loading requests...</p>}

      {/* Display fetch error from useQuery */}
      {fetchError && (
        <div className="rounded-md border p-4 my-4 bg-red-50 text-red-800">
          <p className="font-medium">Error Loading Requests</p>
          <p className="text-sm mt-1">{fetchError.message}</p>
        </div>
      )}

      {/* Display company not found message (only if not loading and no fetch error) */}
      {!isLoading && !fetchError && !companyId && user && (
        <div className="rounded-md border p-4 my-4 bg-yellow-50 text-yellow-800">
          <p className="font-medium">Company Not Found</p>
          <p className="text-sm mt-1">Could not determine the company associated with your user account.</p>
        </div>
      )}

      {/* Render main content only if not loading, no error, and companyId exists */}
      {!isLoading && !fetchError && companyId && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2"> {/* Adjust grid cols as needed */}
            <TabsTrigger value="pending">
              Pending {/* Calculate count based on filteredPirs or status */}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed {/* Calculate count */}
            </TabsTrigger>
            {/* Add more tabs like 'All', 'Rejected' if needed */}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="flex items-center mb-4">
              {/* Search and Filter UI (similar to before) */}
              <div className="relative w-full max-w-md">
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {/* Add Filter button if needed */}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requesting Customer</TableHead>
                    <TableHead>Product Name</TableHead> {/* Added Product Name Header */}
                    <TableHead>Request Details</TableHead>
                    <TableHead>Date Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPirs.length > 0 ? (
                    filteredPirs.map((pir) => {
                      try {
                        // Original Row Rendering (Restored):
                        // Log each PIR being rendered
                        // Defensive checks
                        const customerName = pir.customerName; // Use directly fetched name
                        const requestDetails = pir.request_details || "N/A";
                        // Ensure created_at is valid before creating Date
                        const dateReceived = pir.created_at && !isNaN(new Date(pir.created_at).getTime())
                                             ? new Date(pir.created_at).toLocaleDateString()
                                             : "Invalid Date";
                        const statusDisplay = pir.status ? pir.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';

                        return (
                        <TableRow
                          key={pir.id}
                          className="transition-colors hover:bg-muted/50 cursor-pointer"
                          onClick={() => handlePirAction(pir)}
                        >
                          <TableCell className="font-medium">{customerName || 'Unknown Customer'}</TableCell>
                          <TableCell>{pir.productName}</TableCell> {/* Added Product Name Cell */}
                          <TableCell>{requestDetails}</TableCell>
                          <TableCell>{dateReceived}</TableCell>
                          <TableCell>
                             {/* Supplier-centric status display */}
                             <span
                               className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                 /* Match styling to supplier perspective intent using actual status values */
                                 pir.status === "reviewed" ? "bg-green-100 text-green-800" : /* Approved */
                                 pir.status === "rejected" ? "bg-yellow-100 text-yellow-800" : /* Needs Update (use yellow for attention) */
                                 pir.status === "submitted" || pir.status === "resubmitted" ? "bg-purple-100 text-purple-800" : /* Submitted/Resubmitted */
                                 pir.status === "sent" || pir.status === "in_progress" ? "bg-blue-100 text-blue-800" : /* New/In Progress */
                                 pir.status === "draft" ? "bg-orange-100 text-orange-800" : /* Response Required (use orange for attention) */
                                 pir.status === "canceled" ? "bg-gray-100 text-gray-800" : /* Canceled */
                                 "bg-gray-100 text-gray-800" /* Other/Default */
                               }`}
                            >
                               { /* Supplier-specific status display */
                                 pir.status === 'sent' ? 'New Request' :
                                 pir.status === 'in_progress' ? 'In Progress' :
                                 pir.status === 'submitted' ? 'Submitted' :
                                 pir.status === 'rejected' ? 'Needs Update' :
                                 pir.status === 'resubmitted' ? 'Resubmitted' :
                                 pir.status === 'reviewed' ? 'Approved' :
                                 pir.status === 'draft' ? 'Response Required' : // Keep existing draft handling
                                 pir.status === 'canceled' ? 'Canceled' : // Explicitly handle canceled
                                 (pir.status as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) // Default for any unexpected status (cast to string to avoid 'never')
                               }
                             </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Supplier Action Button Logic */}
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePirAction(pir); // Always goes to the form
                              }}
                              size="sm"
                              // Actionable states for supplier: 'sent' (New), 'rejected' (Needs Update), 'draft' (if saving progress)
                              variant={(pir.status === 'sent' || pir.status === 'rejected' || pir.status === 'draft') ? "default" : "outline"} // Highlight actionable button
                              disabled={!(pir.status === 'sent' || pir.status === 'rejected' || pir.status === 'draft')} // Disable if not actionable
                              className={`ml-auto ${(pir.status === 'sent' || pir.status === 'rejected' || pir.status === 'draft') ? 'bg-brand hover:bg-brand/90 text-white' : ''}`}
                          >
                              {(pir.status === 'sent' || pir.status === 'rejected' || pir.status === 'draft') ? (
                                <> <SendHorizontal className="h-4 w-4 mr-2" /> Respond </>
                              ) : (
                                <> <Eye className="h-4 w-4 mr-2" /> View </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      } catch (error) {
                        // Render a fallback row indicating an error
                        return (
                          <TableRow key={`${pir?.id}-error`}>
                            <TableCell colSpan={5} className="text-red-500">
                              Error rendering request ID: {pir?.id || 'Unknown'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6} // Adjust colSpan for added column
                        className="text-center py-12 text-muted-foreground"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          {/* Moved console log outside JSX */}
                          <Inbox className="h-10 w-10 text-muted-foreground/50" /> {/* Changed Icon */}
                          <h3 className="text-lg font-medium">
                            {/* Removed invalid console.log from here */}
                            No Incoming Requests
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm ? "No requests match your search." : "You currently have no pending requests."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SupplierIncomingRequests;
