import React from "react";
// import { useApp } from "@/context/AppContext"; // Removed useApp
import { useCompanyData } from "@/hooks/use-company-data";
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { PIRStatus, PIRSummary } from "@/types/pir"; // Import PIRSummary and PIRStatus
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter // Added CardFooter
} from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ActionItemsList, { ActionItem } from "@/components/dashboard/ActionItemsList"; // Import the new component

// Define the database record type for the query result (can be shared/moved)
interface PirRequestRecord {
  id: string;
  customer_id: string;
  updated_at: string;
  status: PIRStatus;
  products: {
    name: string;
    supplier_id: string;
    companies: { name: string; } | null;
  } | null;
}

const Dashboard = () => {
  const { userCompanies, currentCompany, isLoadingCompanies, errorCompanies } = useCompanyData();
  // Fetch PIR Requests relevant to the current company
 // --- Existing Query for general stats (Adjusted key and comments) ---
 const fetchPirRequestsGeneral = async (companyId: string): Promise<PIRSummary[]> => {
   // This query might need refinement depending on the exact stats needed.
   // Fetching based only on customer_id might not show supplier-related stats.
   const { data: pirData, error: pirError } = await supabase
     .from('pir_requests')
     .select(`
       id, customer_id, supplier_company_id, updated_at, status,
       product:products!pir_requests_product_id_fkey ( name ),
       supplier:companies!pir_requests_supplier_company_id_fkey ( name )
     `)
     // Example: Fetch where the company is either customer OR supplier
     // .or(`customer_id.eq.${companyId},supplier_company_id.eq.${companyId}`)
     // For now, keeping it simple based on customer_id for the cards
      .eq('customer_id', companyId);


   if (pirError) {
     console.error('Error loading general PIR requests:', pirError);
     throw new Error(`Failed to load general PIR Requests: ${pirError.message}`);
   }
   if (!pirData) return [];

   const transformedPirs: PIRSummary[] = pirData.map((pir: any) => ({
       id: pir.id,
       productName: pir.product?.name ?? 'Unknown Product',
       supplierId: pir.supplier_company_id ?? 'unknown',
       supplierName: pir.supplier?.name ?? 'Unknown Supplier',
       customerId: pir.customer_id,
       updatedAt: pir.updated_at,
       status: pir.status || 'draft',
       tags: [], // Placeholder if needed by PIRSummary
       responseCount: 0, // Placeholder if needed by PIRSummary
     }));
   return transformedPirs;
 };
 // --- End Existing Query ---

 const {
   data: pirRequests, // General requests for stats cards
   isLoading: loadingPirs,
   error: errorPirs,
 } = useQuery<PIRSummary[], Error>({
   queryKey: ['pirRequestsGeneral', currentCompany?.id], // Distinct key
   queryFn: () => fetchPirRequestsGeneral(currentCompany!.id),
   enabled: !!currentCompany,
   staleTime: 1 * 60 * 1000,
   gcTime: 5 * 60 * 1000,
 });


 // --- NEW Query for Action Items ---
 const fetchActionItems = async (companyId: string): Promise<ActionItem[]> => {
   const { data, error } = await supabase
     .from('pir_requests')
     .select(`
       id,
       status,
       updated_at,
       customer_id,
       supplier_company_id,
       product:products!pir_requests_product_id_fkey ( name ),
       supplier:companies!pir_requests_supplier_company_id_fkey ( name ),
       customer:companies!pir_requests_customer_id_fkey ( name )
     `)
     .or(`and(customer_id.eq.${companyId},status.eq.submitted),and(supplier_company_id.eq.${companyId},status.in.("pending","flagged"))`)
     .order('updated_at', { ascending: false }); // Show most recent first

   if (error) {
     console.error('Error loading Action Items:', error);
     throw new Error(`Failed to load Action Items: ${error.message}`);
   }
   if (!data) return [];

   // Transform data into ActionItem[]
   const actionItems: ActionItem[] = data.map((pir: any) => {
     let actionText = "View Request"; // Default
     let link = `/supplier-response-form/${pir.id}`; // Default link
     let description = `Product: ${pir.product?.name ?? 'N/A'}`;

     if (pir.customer_id === companyId) { // Current company is the Customer
       if (pir.status === 'submitted') {
         actionText = "Review Submission";
         link = `/customer-review/${pir.id}`;
         description = `Review needed for ${pir.product?.name ?? 'N/A'} from ${pir.supplier?.name ?? 'N/A'}`;
       }
       // Add other customer actions if needed
     } else if (pir.supplier_company_id === companyId) { // Current company is the Supplier
       if (pir.status === 'pending') {
         actionText = "Respond to Request";
         link = `/supplier-response-form/${pir.id}`;
          description = `Response requested for ${pir.product?.name ?? 'N/A'} by ${pir.customer?.name ?? 'N/A'}`;
       } else if (pir.status === 'flagged') {
         actionText = "Address Revisions";
         link = `/supplier-response-form/${pir.id}`;
          description = `Revisions requested for ${pir.product?.name ?? 'N/A'} by ${pir.customer?.name ?? 'N/A'}`;
       }
       // Add other supplier actions if needed
     }

     return {
       id: pir.id,
       actionText: actionText,
       description: description,
       link: link,
       status: pir.status,
       updatedAt: pir.updated_at,
     };
   });

   return actionItems;
 };

 const {
   data: actionItems,
   isLoading: loadingActionItems,
   error: errorActionItems,
 } = useQuery<ActionItem[], Error>({
   queryKey: ['actionItems', currentCompany?.id],
   queryFn: () => fetchActionItems(currentCompany!.id),
   enabled: !!currentCompany,
   staleTime: 30 * 1000, // Shorter stale time for actions
   gcTime: 5 * 60 * 1000,
 });
 // --- End NEW Query ---

  // --- Calculations based on fetched data ---
  // Note: Supplier/Customer distinction might need refinement based on relationships,
  // using userCompanies length as a placeholder for now.
  const totalCompanies = userCompanies?.length ?? 0;
  // Placeholder counts - adjust logic if needed
  const suppliersCount = totalCompanies;
  const customersCount = 1; // Assuming the currentCompany is the customer

  // Use correct statuses from PIRStatus enum: 'submitted', 'in_review', 'flagged', 'rejected'
  // Use general pirRequests for stats cards
  const pendingSheets = (pirRequests ?? []).filter(
    (pir) => ['submitted', 'in_review', 'flagged', 'rejected', 'pending'].includes(pir.status) // Include pending for supplier view if needed
  );
  const approvedSheets = (pirRequests ?? []).filter(
    (pir) => pir.status === "approved"
  );
  // --- End Calculations ---

  const isLoading = isLoadingCompanies || loadingPirs || loadingActionItems; // Add loading state for action items

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description={currentCompany ? `Overview for ${currentCompany.name}`: "Overview of your compliance management system"}
      />

      {isLoadingCompanies ? (
          <div className="text-center p-4">Loading company data...</div>
      ) : errorCompanies ? (
          <div className="text-center p-4 text-red-500">Error loading company data: {errorCompanies.message}</div>
      ) : !currentCompany ? (
          <div className="text-center p-4 text-muted-foreground">Please select a company to view the dashboard.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Supplier Card - Using totalCompanies as placeholder */}
            <Card className="animate-slide-in [animation-delay:0ms]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Associated Companies</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"> <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <circle cx="9" cy="7" r="4" /> <path d="M22 21v-2a4 4 0 0 0-3-3.87" /> <path d="M16 3.13a4 4 0 0 1 0 7.75" /> </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCompanies}</div>
                {/* <p className="text-xs text-muted-foreground">+3 since last month</p> */}
              </CardContent>
            </Card>

            {/* Customer Card - Placeholder */}
             <Card className="animate-slide-in [animation-delay:100ms]">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <CardTitle className="text-sm font-medium">Current Company</CardTitle>
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"> <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <circle cx="9" cy="7" r="4" /> </svg>
               </CardHeader>
               <CardContent>
                 <div className="text-lg font-bold truncate">{currentCompany.name}</div>
                 {/* <p className="text-xs text-muted-foreground">+1 since last month</p> */}
               </CardContent>
             </Card>

            {/* Pending Reviews Card */}
            <Card className="animate-slide-in [animation-delay:200ms]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending/In Review PIRs</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"> <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /> <polyline points="14 2 14 8 20 8" /> <line x1="16" y1="13" x2="8" y2="13" /> <line x1="16" y1="17" x2="8" y2="17" /> <line x1="10" y1="9" x2="8" y2="9" /> </svg>
              </CardHeader>
              <CardContent>
                {loadingPirs ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (
                    <div className="text-2xl font-bold">{pendingSheets.length}</div>
                )}
                {/* <p className="text-xs text-muted-foreground">+2 since last week</p> */}
              </CardContent>
            </Card>

            {/* Approved Sheets Card */}
            <Card className="animate-slide-in [animation-delay:300ms]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved PIRs</CardTitle>
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"> <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /> <polyline points="22 4 12 14.01 9 11.01" /> </svg>
              </CardHeader>
              <CardContent>
                 {loadingPirs ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                 ) : (
                    <div className="text-2xl font-bold">{approvedSheets.length}</div>
                 )}
                {/* <p className="text-xs text-muted-foreground">+1 since last week</p> */}
              </CardContent>
            </Card>
          </div>
          {/* NEW Action Items Section */}
          <Card className="col-span-full"> {/* Make it span full width */}
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>Tasks requiring your attention.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActionItems ? (
                <div className="text-center p-4 text-muted-foreground">Loading action items...</div>
              ) : errorActionItems ? (
                <div className="text-center p-4 text-red-500">Error loading action items: {errorActionItems.message}</div>
              ) : (
                <ActionItemsList items={actionItems ?? []} />
              )}
            </CardContent>
          </Card>
          {/* End NEW Section */}

          <Tabs defaultValue="recent" className="w-full">
            <TabsList>
              <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              <TabsTrigger value="pending">Pending/In Review</TabsTrigger>
            </TabsList>
            <TabsContent value="recent" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent activity across the platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Placeholder Recent Activity - Replace with actual data */}
                  <div className="text-center p-4 text-muted-foreground">Recent activity feed not yet implemented.</div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="pending" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending/In Review PIRs</CardTitle>
                  <CardDescription>Product sheets awaiting your review or needing revision</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingPirs ? (
                     <div className="text-center p-4">Loading...</div>
                  ) : errorPirs ? (
                     <div className="text-center p-4 text-red-500">Error: {errorPirs.message}</div>
                  ) : pendingSheets.length > 0 ? (
                    pendingSheets.map((pir) => (
                      <div key={pir.id} className="flex items-start space-x-4 rounded-md border p-4">
                        {/* Use 'pending' or 'revision_requested' for amber, 'in_review' for blue */}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${pir.status === 'in_review' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${pir.status === 'in_review' ? 'text-blue-600' : 'text-amber-600'}`}> <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /> <polyline points="14 2 14 8 20 8" /> </svg>
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">{pir.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(pir.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">From: {pir.supplierName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">Status: {pir.status.charAt(0).toUpperCase() + pir.status.slice(1)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-center items-center p-6">
                      <p className="text-muted-foreground">No pending reviews</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Dashboard;
