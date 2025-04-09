import React, { useState } from "react";
import { useCompanyData } from "@/hooks/use-company-data";
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { PIRSummary, PIRStatus } from "@/types/pir"; // Assuming types are needed

// Define the expected data structure for incoming PIRs
interface IncomingPIRRecord {
  id: string;
  customer_id: string;
  updated_at: string;
  status: PIRStatus;
  products: { name: string }[] | null; // Kept name 'products', reverted type back to array
  customer: { name: string }[] | null; // Customer company name (Can be array from query)
  // Add other fields as needed, e.g., tags, response count
}

const IncomingPIRs = () => {
  const { currentCompany, isLoadingCompanies } = useCompanyData();
  const navigate = useNavigate();

  const fetchIncomingPirs = async (supplierId: string): Promise<IncomingPIRRecord[]> => {
    console.log("Fetching incoming PIRs for supplier:", supplierId);
    const { data, error } = await supabase
      .from('pir_requests')
      .select(`
        id,
        customer_id,
        updated_at,
        status,
        products!pir_requests_product_id_fkey ( name ),
        customer:companies!pir_requests_customer_id_fkey ( name )
      `)
      .eq('supplier_company_id', supplierId)
      .order('updated_at', { ascending: false }); // Optional: order by most recent

    if (error) {
      console.error("Error fetching incoming PIRs:", error);
      throw new Error(`Failed to load incoming PIRs: ${error.message}`);
    }
    // Cast the result, ensuring nested objects match the expected structure
    return (data || []) as IncomingPIRRecord[];
  };

  const {
    data: incomingPirs,
    isLoading: isLoadingPirs,
    error: errorPirs,
  } = useQuery<any[], Error>({
    queryKey: ['incomingPirs', currentCompany?.id],
    queryFn: () => fetchIncomingPirs(currentCompany!.id),
    enabled: !!currentCompany,
  });

  const handleViewRequest = (pirId: string) => {
    // Navigate to the form where the supplier responds
    navigate(`/supplier-response-form/${pirId}`);
  };

  const isLoading = isLoadingCompanies || isLoadingPirs;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Information Requests"
        description={currentCompany ? `Incoming requests for ${currentCompany.name}` : "Manage incoming product information requests"}
      />

      {isLoading ? (
        <div className="text-center p-8">Loading requests...</div>
      ) : errorPirs ? (
        <div className="text-center p-8 text-red-500">Error loading requests: {errorPirs.message}</div>
      ) : !currentCompany ? (
        <div className="text-center p-8 text-muted-foreground">Please select a company.</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Requesting Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomingPirs && incomingPirs.length > 0 ? (
                incomingPirs.map((pir) => (
                  <TableRow key={pir.id}>
                    <TableCell className="font-medium">{pir.products?.[0]?.name ?? 'N/A'}</TableCell>
                    <TableCell>{pir.customer?.[0]?.name ?? 'N/A'}</TableCell>
                    <TableCell>
                       <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                         pir.status === "approved" ? "bg-green-100 text-green-800" :
                         pir.status === "rejected" ? "bg-red-100 text-red-800" :
                         pir.status === "submitted" ? "bg-purple-100 text-purple-800" :
                         pir.status === "flagged" ? "bg-yellow-100 text-yellow-800" :
                         pir.status === "in_review" ? "bg-blue-100 text-blue-800" :
                         pir.status === "pending" ? "bg-orange-100 text-orange-800" : // Added pending style
                         "bg-gray-100 text-gray-800" // Draft / Other
                       }`}>
                         {pir.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                       </span>
                    </TableCell>
                    <TableCell>
                      {pir.updated_at ? new Date(pir.updated_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => handleViewRequest(pir.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {pir.status === 'pending' || pir.status === 'flagged' ? 'Respond' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No incoming product information requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default IncomingPIRs;