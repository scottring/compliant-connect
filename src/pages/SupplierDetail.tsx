import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompanyData } from "@/hooks/use-company-data";
import { useTags } from "@/hooks/use-tags";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import { Button } from "@/components/ui/button"; // Keep Button import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import TagBadge from "@/components/tags/TagBadge";
import RequestSheetModal from "@/components/suppliers/RequestSheetModal";
// Import types from Supabase generated types and PIR types
import { Database } from '@/types/supabase';
import { PIRRequest, PIRStatus, PIRResponse as DBPIRResponse, PIRSummary } from "@/types/pir"; // Import PIRSummary
import QuestionItem from "@/components/supplierResponse/QuestionItem";
import { Eye, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TaskProgress from "@/components/ui/progress/TaskProgress";

// Type for Supplier Details Query
type Company = Database['public']['Tables']['companies']['Row'] & { address?: string | null }; // Add optional address
type Tag = Database['public']['Tables']['tags']['Row'];
// Define Section and Subsection if needed, or remove if unused
// type Section = Database['public']['Tables']['sections']['Row'];
// type Subsection = Database['public']['Tables']['subsections']['Row'];

// Type for PIRs associated with this supplier, extending PIRSummary
interface SupplierPIRSummary extends PIRSummary { // Extend PIRSummary
    tags: Tag[]; // Use the full Tag type
    // responseCount: number; // Removed as count is not fetched currently
    customerName?: string;
    totalQuestions?: number; // Optional: Add totalQuestions if calculated
}

// Type definition for DBQuestion
export type QuestionType = 'text' | 'number' | 'boolean' | 'select' | 'multi-select' | 'file' | 'table';
export type DBQuestion = {
  id: string;
  subsection_id: string;
  text: string;
  description: string | null;
  type: QuestionType;
  required: boolean;
  options: any | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};
// End DBQuestion definition

const SupplierDetail = () => {
  const { id: supplierId } = useParams<{ id: string }>();
  // Log ID from URL
  const navigate = useNavigate();
  const { tags: globalTags, isLoadingTags } = useTags();
  const { currentCompany } = useCompanyData();
  const queryClient = useQueryClient();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // --- Fetch Supplier Details Query ---
  const fetchSupplierDetails = async (id: string): Promise<Company> => {
      const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();
      if (error || !data) throw new Error(`Failed to load supplier details: ${error?.message ?? 'Not found'}`);
      return data as Company;
  };

  const {
      data: supplier,
      isLoading: loadingSupplier,
      error: errorSupplier,
  } = useQuery<Company, Error>({
      queryKey: ['supplierDetails', supplierId],
      queryFn: () => fetchSupplierDetails(supplierId!),
      enabled: !!supplierId,
  });
  // --- End Fetch Supplier Details ---

  // --- Fetch PIRs for this Supplier Query ---
  const fetchSupplierPirs = async (id: string): Promise<SupplierPIRSummary[]> => {
      // Log the ID being used
      const { data: pirData, error: pirError } = await supabase
          .from('pir_requests')
          .select(`
              id, customer_id, supplier_company_id, product_id, suggested_product_name, updated_at, status,
              products ( name ),
              customer:companies!customer_id ( name ), 
              pir_tags!inner ( tags ( * ) )
              /* Removed supplier_responses count for now */
           `)
           // Reverted filter to use direct column
           .eq('supplier_company_id', id); 

      if (pirError) throw new Error(`Failed to load PIRs for supplier: ${pirError.message}`);
      // Log raw data
      if (!pirData) return [];

      const transformedPirs: SupplierPIRSummary[] = pirData.map((pir: any) => {
          // Type should be inferred correctly now due to the updated interface
          const tags = pir.pir_tags?.map((pt: { tags: Tag | null }) => pt.tags).filter(Boolean).flat() || [];
          // const responseCount = (pir.supplier_responses || []).length; // Count removed
          return {
              id: pir.id,
              // Use suggested name if product is null, otherwise use product name
              productName: pir.suggested_product_name ?? pir.products?.name ?? 'N/A', 
              supplierId: pir.supplier_company_id,
              supplierName: supplier?.name, // Use supplier name from the other query
              customerId: pir.customer_id,
              customerName: pir.customer?.name ?? 'N/A',
              updatedAt: pir.updated_at,
              status: pir.status || 'draft',
              tags: tags, // Assign fetched tags
              // responseCount: responseCount, // Count removed
              // totalQuestions: Needs calculation
          };
      });
      return transformedPirs;
  };

   const {
      data: supplierPirs,
      isLoading: loadingPirs,
      error: errorPirs,
  } = useQuery<SupplierPIRSummary[], Error>({ // Use correct return type
      queryKey: ['supplierPirs', supplierId],
      queryFn: () => fetchSupplierPirs(supplierId!),
      enabled: !!supplierId,
  });
  // --- End Fetch PIRs ---

  // --- Event Handlers ---
  const handleRequestSheet = () => { setIsRequestModalOpen(true); };
  const handlePirClick = (pirId: string) => { navigate(`/supplier-response-form/${pirId}`); };
  // --- End Event Handlers ---

  // --- Helper Functions ---
  const formattedDate = (dateStr: string | null | undefined) => { /* ... */
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const getStatusStyle = (status: PIRStatus) => { /* ... */
    // Use only statuses defined in the PIRStatus enum
    const statusColors: Record<PIRStatus, { bg: string; text: string }> = {
      // pending: { bg: "bg-amber-100", text: "text-amber-800" }, // 'pending' is not in the enum
      in_review: { bg: "bg-blue-100", text: "text-blue-800" },
      approved: { bg: "bg-green-100", text: "text-green-800" },
      rejected: { bg: "bg-red-100", text: "text-red-800" },
      flagged: { bg: "bg-yellow-100", text: "text-yellow-800" }, // Added flagged
      submitted: { bg: "bg-purple-100", text: "text-purple-800" }, // Added submitted
      draft: { bg: "bg-gray-100", text: "text-gray-800" },
    };
    return statusColors[status] || statusColors.draft;
  };
  const getStatusLabel = (status: PIRStatus) => { /* ... */
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  // --- End Helper Functions ---

  // --- Render Logic ---
  if (loadingSupplier) { return <div className="p-12 text-center">Loading Supplier...</div>; }
  if (errorSupplier || !supplier) { return <div className="py-12 text-center"><h2 className="text-2xl font-bold mb-4">Supplier not found</h2><p className="text-red-500 mb-4">{errorSupplier?.message}</p><Button onClick={() => navigate("/suppliers")}>Back to Suppliers</Button></div>; }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Supplier Detail - ${supplier.name}`}
        actions={ <Button variant="default" className="bg-brand hover:bg-brand-700"> Edit </Button> }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Information */}
        <Card>
          <CardHeader><CardTitle>Supplier Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><span className="text-sm font-medium text-muted-foreground">Supplier Name:</span><p>{supplier.name}</p></div>
            <div><span className="text-sm font-medium text-muted-foreground">Primary Contact:</span><p>{supplier.contact_name || 'N/A'}</p></div>
          </CardContent>
        </Card>

        {/* General Information */}
        <Card>
          <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><span className="text-sm font-medium text-muted-foreground">Address:</span><p>{supplier.address || 'N/A'}</p></div>
            <div><span className="text-sm font-medium text-muted-foreground">Phone:</span><p>{supplier.contact_phone || "N/A"}</p></div>
            <div><span className="text-sm font-medium text-muted-foreground">Email:</span><p>{supplier.contact_email || 'N/A'}</p></div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Product Information Requests Received</h2>
          {currentCompany && (
             <Button variant="default" className="bg-brand hover:bg-brand-700" onClick={handleRequestSheet}>
               New PIR
             </Button>
          )}
        </div>

        {loadingPirs ? (
          <div className="text-center p-8">Loading PIRs...</div>
        ) : errorPirs ? (
           <div className="text-center p-8 text-red-500">Error loading PIRs: {errorPirs.message}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Requesting Customer</TableHead>
                  <TableHead>Info Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(supplierPirs ?? []).length > 0 ? (
                  supplierPirs!.map((pir) => ( // Use SupplierPIRSummary type here
                    <TableRow key={pir.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handlePirClick(pir.id)}>
                      <TableCell className="font-medium">{pir.productName}</TableCell>
                      <TableCell>{pir.customerName}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <div className="flex flex-wrap gap-1" title={pir.tags.map(t => t.name).join(', ')}>
                            {pir.tags.map(tag => <TagBadge key={tag.id} tag={tag} size="sm" />)}
                            {pir.tags.length === 0 && '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusStyle(pir.status).bg} ${getStatusStyle(pir.status).text} border-none`}>
                          {getStatusLabel(pir.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formattedDate(pir.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button onClick={(e) => { e.stopPropagation(); handlePirClick(pir.id); }} size="sm" variant="outline" className="ml-auto">
                          <Eye className="h-4 w-4 mr-2" /> View/Respond
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No product information requests received by this supplier yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* PIR Modal - Pass supplier ID/Name */}
      {supplier && (
          <RequestSheetModal
            open={isRequestModalOpen}
            onOpenChange={setIsRequestModalOpen}
            supplierId={supplier.id}
            supplierName={supplier.name}
          />
      )}

      {/* Removed Mock Tasks/Comments Sections */}

    </div>
  );
};

export default SupplierDetail;
