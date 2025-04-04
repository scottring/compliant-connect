import React, { useState, useEffect } from "react";
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
import { Search, Filter, Plus, PackageOpen, Inbox } from "lucide-react"; // Changed icon
import { toast } from "sonner";
// Remove ProductSheet type if not used directly anymore
// import { ProductSheet } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { PirRequest, Company } from "../types/index"; // Explicitly importing from index file

const OurProducts = () => { // Was IncomingRequests, renamed back for file consistency
  console.log('OurProducts')
  const { user } = useAuth(); // Get user from AuthContext
  console.log('Rendering OurProducts - Initial:', { user: !!user }); // Log initial render
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [incomingPirs, setIncomingPirs] = useState<PirRequest[]>([]);
  const [requestingCompanies, setRequestingCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending"); // Default tab for suppliers
  const navigate = useNavigate();

  // 1. Fetch the user's company ID
  useEffect(() => {
    // This effect now ONLY fetches the company ID and doesn't manage the main loading state
    const fetchCompanyId = async () => {
      if (user) {
        // setIsLoading(true); // Removed: Loading managed by PIR fetch effect
        console.log("Fetching company ID for user:", user.id);
        try {
          const { data, error } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            // .single(); // Removed .single() to check the array directly

          console.log("Raw data from company_users fetch:", data); // Log raw data
          if (error) {
            console.error("Error fetching company ID:", error);
            toast.error("Could not determine your company association.");
            setCompanyId(null);
          } else if (data && data.length > 0 && data[0].company_id) {
            // Check if data is an array, has elements, and the first element has company_id
            const foundCompanyId = data[0].company_id;
            console.log("User associated with company ID:", foundCompanyId);
            setCompanyId(foundCompanyId);
            console.log('Set companyId state:', foundCompanyId);
          } else {
            // Handle case where data is null, empty array, or row has no company_id
            console.log("No company association found in returned data.");
            setCompanyId(null);
          }
        } catch (err) {
          console.error("Unexpected error fetching company ID:", err);
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

  // 2. Fetch incoming PIRs based on company ID
  useEffect(() => {
    // This effect fetches PIRs AND manages the main loading state
    const fetchPirs = async () => {
      // Start loading only when we have a user and are attempting to fetch
      // based on the companyId derived from that user.
      if (user) {
        setIsLoading(true);
        // Only proceed if companyId is actually determined
        if (companyId) {
        console.log("Fetching PIRs for supplier company ID:", companyId);
        try {
          const { data: pirsData, error: pirsError } = await supabase
            .from('pir_requests')
            .select('*') // Select all PIR fields
            .eq('supplier_company_id', companyId); // Corrected column name

          if (pirsError) {
            console.error("Error fetching PIR requests:", pirsError);
            toast.error("Failed to load incoming requests.");
            setIncomingPirs([]);
          } else {
            console.log("Fetched PIRs:", pirsData);
            setIncomingPirs(pirsData || []);
            console.log('Set incomingPirs state:', pirsData?.length); // Log state update

            // Fetch requesting company details
            const customerIds = [...new Set(pirsData?.map(pir => pir.customer_id).filter(id => id))];
            if (customerIds.length > 0) {
              const { data: companiesData, error: companiesError } = await supabase
                .from('companies')
                .select('*') // Fetch all fields to match Company type
                .in('id', customerIds);

              if (companiesError) {
                console.error("Error fetching requesting companies:", companiesError);
                // Handle partial data loading?
              } else {
                setRequestingCompanies(companiesData || []);
                console.log('Set requestingCompanies state:', companiesData?.length); // Log state update
              }
            }
          }
        } catch (err) {
          console.error("Unexpected error fetching PIRs:", err);
          toast.error("An error occurred while loading requests.");
          setIncomingPirs([]);
        } finally {
          console.log('Setting isLoading state to false (fetch attempt done)'); // Log state update
          setIsLoading(false); // Set loading false after fetch attempt
        }
        } else {
          // Handle case where companyId is null (either initially or after fetch error)
          console.log("No company ID found, skipping PIR fetch.");
          setIncomingPirs([]);
          setRequestingCompanies([]);
          setIsLoading(false); // Set loading false as fetch attempt is complete (skipped)
        }
      } else {
        // No user logged in
        console.log('Setting isLoading state to false (no user/companyId)'); // Log state update
        setIsLoading(false);
        setIncomingPirs([]);
        setRequestingCompanies([]);
      }
    };

    fetchPirs();
  }, [companyId]);

  // --- Helper Functions --- Moved Up ---
  const getCompanyName = (customerId: string | null): string => {
    if (!customerId) return "Unknown Customer";
    const company = requestingCompanies.find(c => c.id === customerId);
    return company ? company.name : "Loading..."; // Or "Unknown ID"
  };

  // --- Filtering Logic (Restored) ---
  const getFilteredPirs = () => {
    console.log('Filtering PIRs:', { activeTab, incomingPirsCount: incomingPirs.length, searchTerm }); // Log filter start
    let pirsToFilter = incomingPirs;

    // Adjust filtering based on tabs (e.g., 'pending', 'completed')
    if (activeTab === "pending") {
      pirsToFilter = incomingPirs.filter(pir => pir.status !== 'approved' && pir.status !== 'rejected'); // Use 'approved' instead of 'completed'
    } else if (activeTab === "completed") { // Should be 'approved' tab based on status correction
      pirsToFilter = incomingPirs.filter(pir => pir.status === 'approved'); // Use 'approved' instead of 'completed'
    }
    // Add more statuses or 'all' tab as needed

    // Apply search term
    const result = pirsToFilter.filter(pir => // Assign to result
      pir.request_details?.toLowerCase().includes(searchTerm.toLowerCase()) || // Search details
      getCompanyName(pir.customer_id)?.toLowerCase().includes(searchTerm.toLowerCase()) // Search customer name
      // Add more searchable fields if needed (e.g., product name if available)
    );
    console.log('Filtered PIRs count:', result.length); // Log filter result using the correct variable
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
  console.log('Rendering OurProducts - Final State:', { isLoading, companyId, user: !!user, incomingPirsCount: incomingPirs.length, filteredPirsCount: filteredPirs.length });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Requests" // Updated Title
        description="Review and respond to Product Information Requests from your customers" // Updated Description
        // Removed "Add Product" action for suppliers on this page
      />

      {isLoading && <p>Loading requests...</p>}

      {!isLoading && !companyId && user && (
        <div className="rounded-md border p-4 my-4 bg-yellow-50 text-yellow-800">
          <p className="font-medium">Company Not Found</p>
          <p className="text-sm mt-1">Could not determine the company associated with your user account.</p>
        </div>
      )}

      {!isLoading && companyId && (
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
                    {/* Update Table Headers for PIRs */}
                    <TableHead>Requesting Customer</TableHead>
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
                        console.log('Rendering PIR row:', pir.id, pir.status);
                        // Defensive checks
                        const customerName = getCompanyName(pir.customer_id);
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
                          <TableCell className="font-medium">{customerName}</TableCell>
                          <TableCell>{requestDetails}</TableCell>
                          <TableCell>{dateReceived}</TableCell>
                          <TableCell>
                             <span
                               className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                 pir.status === "approved" // Use 'approved' instead of 'completed'
                                   ? "bg-green-100 text-green-800"
                                   : pir.status === "rejected"
                                   ? "bg-red-100 text-red-800"
                                   : pir.status === "in_review" // Use 'in_review' instead of 'in_progress'
                                   ? "bg-yellow-100 text-yellow-800"
                                   : "bg-blue-100 text-blue-800" // Default for 'pending' etc.
                               }`}
                             >
                               {statusDisplay}
                             </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePirAction(pir);
                              }}
                              variant="secondary"
                              size="sm"
                              className="bg-brand hover:bg-brand-700 text-white"
                            >
                              View / Respond
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      } catch (error) {
                        console.error(`Error rendering PIR row for ID: ${pir?.id}`, error, pir);
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
                        colSpan={5} // Adjust colSpan
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

export default OurProducts;
