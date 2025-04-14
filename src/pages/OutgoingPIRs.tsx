import React, { useState, useEffect } from "react";
// import { useApp } from "@/context/AppContext"; // Removed useApp
import { useCompanyData } from "@/hooks/use-company-data"; // Use company data hook
import { useTags } from "@/hooks/use-tags"; // Use tags hook
import { useQuery } from '@tanstack/react-query'; // Import query hook
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Eye, Calendar, Tag, ArrowUpDown, Plus, Flag, ClipboardCheck } from "lucide-react"; // Added Plus, Flag, ClipboardCheck
import TaskProgress from "@/components/ui/progress/TaskProgress";
import { PIRSummary, PIRStatus, PIR_STATUS_DISPLAY } from "@/types/pir"; // Import shared types, added PIR_STATUS_DISPLAY

// Define the database record type for the query result (Adjusted)
interface PirRequestRecord {
  id: string;
  customer_id: string;
  supplier_company_id?: string; // Added optional supplier id
  product_id?: string; // Added optional product id
  updated_at: string;
  status: PIRStatus;
  products: { name: string; } | null;
  companies: { name: string; } | null; // Assuming direct relation for supplier name if product join fails
  pir_tags: { tags: { id: string; name: string; } | null }[]; // Fetch tags via join
  pir_responses: { id: string, question_id: string }[]; // Fetch response IDs to count answers
}


const OutgoingPIRs = () => { // Renamed from ProductSheets
  // Use React Query hooks
  const { currentCompany, isLoadingCompanies } = useCompanyData();
  // const { tags, isLoadingTags } = useTags(); // Tags might be fetched within PIR query now

  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch PIR Requests relevant to the current company (as customer)
  const fetchPirRequests = async (customerId: string): Promise<PIRSummary[]> => {
    const { data: pirData, error: pirError } = await supabase
      .from('pir_requests')
      .select(`
        id, customer_id, supplier_company_id, product_id, updated_at, status,
        products ( name ),
        companies!pir_requests_supplier_company_id_fkey ( name ),
        pir_tags ( tags ( id, name ) ),
        pir_responses ( id, question_id )
      `)
      .eq('customer_id', customerId);

    if (pirError) {
      console.error('Error loading PIR requests:', pirError);
      throw new Error(`Failed to load PIR Requests: ${pirError.message}`);
    }
    if (!pirData) return [];

    // Transform data
    const transformedPirs: PIRSummary[] = pirData.map((pir: any) => {
      const productName = pir.products?.name ?? 'Unknown Product';
      // Use direct company join for supplier name as fallback
      const supplierName = pir.companies?.name ?? 'Unknown Supplier';
      const tags = (pir.pir_tags?.map((pt: any) => pt.tags).filter(Boolean) || []) as { id: string; name: string }[];
      const responses = (pir.pir_responses || []) as { id: string, question_id: string }[];

      return {
        id: pir.id,
        productName: productName,
        supplierId: pir.supplier_company_id ?? 'unknown', // Use direct FK if available
        supplierName: supplierName,
        customerId: pir.customer_id,
        updatedAt: pir.updated_at,
        status: pir.status || 'draft',
        // Add tags and response count for calculations
        tags: tags,
        responseCount: responses.length,
        // We need total question count separately if not fetched here
      };
    });
    return transformedPirs;
  };

  const {
    data: pirRequests,
    isLoading: loadingPirs,
    error: errorPirs,
  } = useQuery<any[], Error>({ // Use 'any[]' temporarily, refine type later
    queryKey: ['pirRequestsWithDetails', currentCompany?.id],
    queryFn: () => fetchPirRequests(currentCompany!.id),
    enabled: !!currentCompany,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Helper function (can be memoized)
  const getTagNames = (tags: { id: string; name: string }[]) => {
    return tags.map(tag => tag.name).filter(Boolean).join(", ");
  };

  // Filter PIRs based on search term
  const filteredProductSheets = (pirRequests ?? []).filter((sheet) =>
    sheet.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter by new status values
  const drafts = filteredProductSheets.filter((sheet) => sheet.status === "draft");
  const sentInProgress = filteredProductSheets.filter((sheet) => sheet.status === "sent" || sheet.status === "in_progress");
  const submittedResubmitted = filteredProductSheets.filter((sheet) => sheet.status === "submitted" || sheet.status === "resubmitted");
  const terminal = filteredProductSheets.filter((sheet) => sheet.status === "reviewed" || sheet.status === "rejected" || sheet.status === "canceled");
  // Individual statuses if needed for specific tabs later
  const reviewed = filteredProductSheets.filter((sheet) => sheet.status === "reviewed");
  const rejected = filteredProductSheets.filter((sheet) => sheet.status === "rejected");
  const canceled = filteredProductSheets.filter((sheet) => sheet.status === "canceled");

  const handleProductSheetClick = (pirId: string, status: PIRStatus) => {
    // Customer should always go to the CustomerReview page.
    // It handles both active review (submitted/resubmitted) and read-only view (reviewed/rejected/canceled).
    // Other statuses like draft/sent/in_progress might also be viewable there in a read-only state.
    if (status === 'submitted' || status === 'resubmitted' || status === 'reviewed' || status === 'rejected' || status === 'canceled' || status === 'in_progress') {
      navigate(`/customer-review/${pirId}`);
    } else {
      // For 'draft', maybe navigate somewhere else or show a message? (Removed 'sent')
      // For now, let's also direct them to customer-review, which might show limited info or a status message.
      console.warn(`OutgoingPIRs: Navigating to CustomerReview for status ${status}. Consider a dedicated view.`);
      navigate(`/customer-review/${pirId}`);
    }
  };

  const isLoading = isLoadingCompanies || loadingPirs;

  const renderProductSheetTable = (sheets: any[]) => ( // Use any[] temporarily
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Categories</TableHead>
            {/* <TableHead>Completion</TableHead> */} {/* Completion needs total question count */}
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheets.length > 0 ? (
            sheets.map((sheet) => {
              // TODO: Calculate completion rate accurately
              // Need total question count for this PIR
              // const completionRate = sheet.totalQuestions > 0 ? Math.round((sheet.responseCount / sheet.totalQuestions) * 100) : 0;
              const completionRate = Math.round(Math.random() * 100); // Placeholder

              return (
                <TableRow
                  key={sheet.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleProductSheetClick(sheet.id, sheet.status)}
                >
                  <TableCell className="font-medium">{sheet.productName}</TableCell>
                  <TableCell>{sheet.supplierName}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={getTagNames(sheet.tags)}>
                    {getTagNames(sheet.tags) || "—"}
                  </TableCell>
                  {/* <TableCell> <TaskProgress value={completionRate} size="sm" showLabel /> </TableCell> */}
                  <TableCell>
                    {/* Customer-centric status display */}
                    {/* Use styles consistent with SupplierProducts */}
                    {/* Customer-centric status display with updated logic */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sheet.status === 'reviewed' ? 'bg-green-100 text-green-800' :
                      sheet.status === 'submitted' ? 'bg-orange-100 text-orange-800' : // Submitted by supplier, needs customer review
                      sheet.status === 'resubmitted' ? 'bg-purple-100 text-purple-800' : // Resubmitted by supplier, needs customer review
                      sheet.status === 'sent' ? 'bg-yellow-100 text-yellow-800' : // Sent by customer, awaiting supplier action
                      sheet.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : // Supplier working on it
                      sheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      sheet.status === 'canceled' ? 'bg-gray-500 text-white' : // Use a distinct gray for canceled
                      sheet.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800' // Default fallback
                    }`}>
                      {/* Display text logic updated */}
                      {sheet.status === 'sent' ? 'Sent' :
                       sheet.status === 'submitted' ? 'Pending Review' :
                       sheet.status === 'resubmitted' ? 'Pending Review' : // Also pending review
                       (PIR_STATUS_DISPLAY[sheet.status] || (sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)))}
                    </span>
                  </TableCell>
                  <TableCell>
                    {sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleProductSheetClick(sheet.id, sheet.status); }}
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      // Disable button for certain statuses if needed, e.g., draft?
                      // disabled={sheet.status === 'draft'}
                    >
                      {/* Change label based on status */}
                      {/* Updated button label based on status */}
                      {sheet.status === 'submitted' || sheet.status === 'resubmitted' ? (
                        <> <ClipboardCheck className="h-4 w-4 mr-2" /> Review </> // Action is to review
                      ) : (
                        <> <Eye className="h-4 w-4 mr-2" /> View </> // Default action is to view for sent, in_progress, reviewed, rejected, canceled, draft
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center"> {/* Adjusted colSpan */}
                No product sheets found for this status.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Sheets" // Changed title
        description={currentCompany ? `Viewing requests for ${currentCompany.name}` : "Manage and track compliance information"}
        actions={
          <PageHeaderAction
            label="Request New Sheet" // Changed label
            onClick={() => navigate('/request-sheet')} // Navigate to a dedicated request page/modal trigger
            disabled={isLoading || !currentCompany}
            icon={<Plus className="h-4 w-4" />}
          />
        }
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by product or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        {/* Add Filter/Tag buttons if needed */}
      </div>

      {isLoading ? (
          <div className="text-center p-8">Loading requests...</div>
      ) : errorPirs ? (
          <div className="text-center p-8 text-red-500">Error loading requests: {errorPirs.message}</div>
      ) : !currentCompany ? (
          <div className="text-center p-8 text-muted-foreground">Please select a company.</div>
      ) : (
          <Tabs defaultValue="all" className="w-full">
            {/* Updated Tabs based on new status groupings */}
            <TabsList className="grid w-full grid-cols-5"> {/* Adjusted grid cols */}
              <TabsTrigger value="all">All ({filteredProductSheets.length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({drafts.length})</TabsTrigger>
              <TabsTrigger value="in_progress">Sent / In Progress ({sentInProgress.length})</TabsTrigger>
              <TabsTrigger value="needs_review">Needs Review ({submittedResubmitted.length})</TabsTrigger>
              <TabsTrigger value="terminal">Completed / Canceled ({terminal.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">{renderProductSheetTable(filteredProductSheets)}</TabsContent>
            <TabsContent value="draft" className="mt-6">{renderProductSheetTable(drafts)}</TabsContent>
            <TabsContent value="in_progress" className="mt-6">{renderProductSheetTable(sentInProgress)}</TabsContent>
            <TabsContent value="needs_review" className="mt-6">{renderProductSheetTable(submittedResubmitted)}</TabsContent>
            <TabsContent value="terminal" className="mt-6">{renderProductSheetTable(terminal)}</TabsContent>
          </Tabs>
      )}
    </div>
  );
};

export default OutgoingPIRs; // Renamed from ProductSheets
