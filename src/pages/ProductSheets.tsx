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
import { Search, Filter, Eye, Calendar, Tag, ArrowUpDown, Plus } from "lucide-react"; // Added Plus
import TaskProgress from "@/components/ui/progress/TaskProgress";
import { PIRSummary, PIRStatus } from "@/types/pir"; // Import shared types
import RequestSheetModal from "@/components/suppliers/RequestSheetModal"; // Import the modal
import { Database } from '@/types/supabase'; // Import Database type for Tag definition if needed

// Define Tag type locally if not correctly imported or needs adjustment for mock
type MockTag = { id: string; name: string; created_at?: string; updated_at?: string }; // Added optional fields

// Define the database record type for the query result (Adjusted)
interface PirRequestRecord {
  id: string;
  customer_id: string;
  supplier_company_id?: string; // Added optional supplier id
  product_id?: string; // Added optional product id
  updated_at: string;
  status: PIRStatus;
  products: { name: string; } | null;
  // Use explicit relationship alias for supplier company
  supplier: { name: string; } | null;
  pir_tags: { tags: { id: string; name: string; } | null }[]; // Fetch tags via join
  pir_responses: { id: string, question_id: string }[]; // Corrected table name
}


const ProductSheets = () => {
  // Use React Query hooks
  const { currentCompany, isLoadingCompanies } = useCompanyData();
  // const { tags, isLoadingTags } = useTags(); // Tags might be fetched within PIR query now

  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false); // State for modal

  // --- MOCK DATA STATE FOR DEMO ---
  // Removed mock data state as it's not needed when using the modal for creation
  // const [mockRequest, setMockRequest] = useState<PIRSummary | null>(null);
  // useEffect(() => { ... }, [currentCompany]);
  // --- END MOCK DATA STATE ---

  // --- Additional Static Mock Data for List ---
  // Keep static mock data for display purposes
  const staticMockPirs: PIRSummary[] = [
      { id: 'mock-pir-456', productName: 'Component Alpha', supplierId: 'supp-abc', supplierName: 'Alpha Components', customerId: currentCompany?.id ?? 'mock-customer-789', updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'approved', tags: [{ id: 'tag-3', name: 'Material' }], responseCount: 15, totalQuestions: 15 },
      { id: 'mock-pir-789', productName: 'Assembly Beta', supplierId: 'supp-def', supplierName: 'Beta Assemblies Ltd', customerId: currentCompany?.id ?? 'mock-customer-789', updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'in_review', tags: [{ id: 'tag-4', name: 'Process' }, { id: 'tag-1', name: 'Compliance' }], responseCount: 10, totalQuestions: 12 },
      { id: 'mock-pir-000', productName: 'Gadget Gamma', supplierId: 'supp-ghi', supplierName: 'Gamma Gadgets', customerId: currentCompany?.id ?? 'mock-customer-789', updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(), status: 'rejected', tags: [{ id: 'tag-5', name: 'Obsolete' }], responseCount: 5, totalQuestions: 5 },
  ];
  // --- End Additional Static Mock Data ---


  // Fetch PIR Requests relevant to the current company (as customer)
  const fetchPirRequests = async (customerId: string): Promise<PIRSummary[]> => {
    const { data: pirData, error: pirError } = await supabase
      .from('pir_requests')
      .select(`
        id, customer_id, supplier_company_id, product_id, updated_at, status,
        products ( name ),
        supplier:companies!pir_requests_supplier_company_id_fkey ( name ),
        pir_tags ( tags ( id, name ) ),
        pir_responses ( id, question_id ) // Corrected table name
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
      // Use the aliased supplier join result
      const supplierName = pir.supplier?.name ?? 'Unknown Supplier';
      const tags = (pir.pir_tags?.map((pt: any) => pt.tags).filter(Boolean) || []) as MockTag[]; // Use MockTag type
      const responses = (pir.pir_responses || []) as { id: string, question_id: string }[]; // Corrected property name

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
  } = useQuery<PIRSummary[], Error>({ // Use PIRSummary[] type
    queryKey: ['pirRequestsWithDetails', currentCompany?.id],
    queryFn: () => fetchPirRequests(currentCompany!.id),
    enabled: !!currentCompany,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Combine fetched data with static mock data for demo purposes
  const combinedPirRequests = [...(pirRequests ?? []), ...staticMockPirs];

  // Helper function (can be memoized)
  const getTagNames = (tags: MockTag[] = []) => { // Use MockTag type and default value
    return tags.map(tag => tag.name).filter(Boolean).join(", ");
  };

  // Filter PIRs based on search term
  // Use combinedPirRequests for filtering
  const filteredProductSheets = (combinedPirRequests).filter((sheet) =>
    sheet.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter by status using only valid enum values
  const drafts = filteredProductSheets.filter((sheet) => sheet.status === "draft");
  const submitted = filteredProductSheets.filter((sheet) => sheet.status === "submitted");
  const reviewing = filteredProductSheets.filter((sheet) => sheet.status === "in_review");
  const approved = filteredProductSheets.filter((sheet) => sheet.status === "approved");
  const rejected = filteredProductSheets.filter((sheet) => sheet.status === "rejected");
  const flagged = filteredProductSheets.filter((sheet) => sheet.status === "flagged");
  const pendingSupplier = filteredProductSheets.filter((sheet) => sheet.status === "pending_supplier");
  const pendingReview = filteredProductSheets.filter((sheet) => sheet.status === "pending_review");
  const accepted = filteredProductSheets.filter((sheet) => sheet.status === "accepted");


  const handleProductSheetClick = (pirId: string) => {
    // Navigate to the response form or review page based on role/status?
    // Find the request (could be real or mock)
    const request = combinedPirRequests.find(r => r.id === pirId);

    // Determine navigation based on status
    if (request?.status === 'submitted' || request?.status === 'in_review' || request?.status === 'flagged' || request?.status === 'pending_review') {
         console.log("Navigating PIR to Customer Review:", pirId);
         navigate(`/customer-review/${pirId}`);
    } else if (request?.status === 'pending_supplier') {
         // If pending supplier, supplier should view it (adjust if customer needs read-only view)
         console.log("Navigating PIR to Supplier Response Form:", pirId);
         navigate(`/supplier-response-form/${pirId}`);
    } else {
        // Default or other statuses (draft, approved, accepted, rejected) - maybe a detail view?
        // For now, let's default to supplier form view, adjust as needed
        console.log("Default navigation to Supplier Response Form for PIR:", pirId);
        navigate(`/supplier-response-form/${pirId}`);
    }
  };

  const isLoading = isLoadingCompanies || loadingPirs;

  const renderProductSheetTable = (sheets: PIRSummary[]) => ( // Use PIRSummary[] type
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
                  onClick={() => handleProductSheetClick(sheet.id)}
                >
                  <TableCell className="font-medium">{sheet.productName}</TableCell>
                  <TableCell>{sheet.supplierName}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={getTagNames(sheet.tags)}>
                    {getTagNames(sheet.tags) || "—"}
                  </TableCell>
                  {/* <TableCell> <TaskProgress value={completionRate} size="sm" showLabel /> </TableCell> */}
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                      sheet.status === "approved" ? "bg-green-100 text-green-800" :
                      sheet.status === "accepted" ? "bg-green-100 text-green-800" : // Style accepted same as approved
                      sheet.status === "rejected" ? "bg-red-100 text-red-800" :
                      sheet.status === "in_review" ? "bg-blue-100 text-blue-800" :
                      sheet.status === "pending_review" ? "bg-cyan-100 text-cyan-800" : // Style pending_review
                      sheet.status === "pending_supplier" ? "bg-orange-100 text-orange-800" : // Style pending_supplier
                      sheet.status === "flagged" ? "bg-yellow-100 text-yellow-800" : // Style flagged
                      sheet.status === "submitted" ? "bg-purple-100 text-purple-800" : // Style submitted
                      "bg-gray-100 text-gray-800" // Draft
                    }`}>
                      {sheet.status.replace('_', ' ')} {/* Replace underscore for display */}
                    </span>
                  </TableCell>
                  <TableCell>
                    {sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleProductSheetClick(sheet.id); }}
                      size="sm" variant="outline" className="ml-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" /> View
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
            onClick={() => setIsRequestModalOpen(true)} // Open the modal
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
            {/* Adjusted grid cols and included new statuses */}
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="all">All ({filteredProductSheets.length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({drafts.length})</TabsTrigger>
              <TabsTrigger value="pending_supplier">Pending Supplier ({pendingSupplier.length})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
              <TabsTrigger value="pending_review">Pending Review ({pendingReview.length})</TabsTrigger>
              <TabsTrigger value="flagged">Flagged ({flagged.length})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({accepted.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">{renderProductSheetTable(filteredProductSheets)}</TabsContent>
            <TabsContent value="draft" className="mt-6">{renderProductSheetTable(drafts)}</TabsContent>
            <TabsContent value="pending_supplier" className="mt-6">{renderProductSheetTable(pendingSupplier)}</TabsContent>
            <TabsContent value="submitted" className="mt-6">{renderProductSheetTable(submitted)}</TabsContent>
            <TabsContent value="pending_review" className="mt-6">{renderProductSheetTable(pendingReview)}</TabsContent>
            <TabsContent value="flagged" className="mt-6">{renderProductSheetTable(flagged)}</TabsContent>
            <TabsContent value="accepted" className="mt-6">{renderProductSheetTable(accepted)}</TabsContent>
            <TabsContent value="rejected" className="mt-6">{renderProductSheetTable(rejected)}</TabsContent>
          </Tabs>
      )}

      {/* Render the Modal */}
      <RequestSheetModal
        open={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        // supplierId and supplierName can be omitted if selecting supplier within modal
      />
    </div>
  );
};

export default ProductSheets;
