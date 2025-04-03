import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext"; // Keep for mock data? Review if needed.
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import SupplierTable from "@/components/suppliers/SupplierTable";
import InviteSupplierModal from "@/components/suppliers/InviteSupplierModal";
// Import RelationshipStatus along with other types
import { Company, RelationshipType, SupplierRelationship, RelationshipStatus } from "@/types/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAllData } from "@/utils/resetData";
import { supabase } from "@/integrations/supabase/client";
import { Database } from '@/integrations/supabase/types';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext"; // Keep for user object
import { useCompanyData } from "@/hooks/use-company-data"; // Import new hook
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query'; // Import query hooks
import { SupplierCard } from "@/components/suppliers/SupplierCard";
import { AddSupplierModal } from "@/components/suppliers/AddSupplierModal";

type CompanyRow = Database['public']['Tables']['companies']['Row'];
type RelationshipRow = Database['public']['Tables']['company_relationships']['Row'];

// Type for the add supplier mutation variables
type AddSupplierInput = {
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    relationshipType: RelationshipType;
    customerId: string; // Need customer ID for relationship
};

// --- Reusable Add Supplier Mutation Hook ---
const useAddSupplierMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<Company, Error, AddSupplierInput> => {
    return useMutation<Company, Error, AddSupplierInput>({
        mutationFn: async (data) => {
            // First verify the customer company exists
            const { data: customerCompany, error: customerError } = await supabase
                .from('companies')
                .select('id, name')
                .eq('id', data.customerId)
                .limit(1)
                .maybeSingle();

            if (customerError) {
                throw new Error(`Error finding customer company: ${customerError.message}`);
            }
            if (!customerCompany) {
                throw new Error(`Customer company not found with ID: ${data.customerId}`);
            }

            console.log('Creating supplier for customer:', customerCompany.name);

            // Insert the new supplier company
            const { data: newSupplier, error: supplierError } = await supabase
                .from('companies')
                .insert({
                    name: data.name,
                    contact_name: data.contactName,
                    contact_email: data.contactEmail,
                    contact_phone: data.contactPhone
                })
                .select()
                .single();

            if (supplierError) {
                throw new Error(`Error creating supplier: ${supplierError.message}`);
            }
            if (!newSupplier) {
                throw new Error("Failed to create supplier: No data returned.");
            }

            console.log('Created supplier:', newSupplier.id);

            // Create the relationship
            const { error: relationshipError } = await supabase
                .from('company_relationships')
                .insert({
                    customer_id: data.customerId,
                    supplier_id: newSupplier.id,
                    status: 'pending',
                    type: data.relationshipType
                });

            if (relationshipError) {
                // Clean up the supplier if relationship creation fails
                await supabase.from('companies').delete().eq('id', newSupplier.id);
                throw new Error(`Error creating relationship: ${relationshipError.message}`);
            }

            console.log('Created relationship between', data.customerId, 'and', newSupplier.id);

            return newSupplier as Company;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers', variables.customerId] });
            toast.success("Supplier added successfully");
        },
        onError: (error) => {
            console.error("Error in handleAddSupplierSubmit:", error);
            toast.error(`Failed to add supplier: ${error.message}`);
        },
    });
};
// --- End Add Supplier Mutation Hook ---


const Suppliers = () => {
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state
  const { currentCompany, isLoadingCompanies } = useCompanyData(); // Get company data
  // const { companies } = useApp(); // Remove if mock data is no longer needed
  const queryClient = useQueryClient();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // const [filteredSuppliers, setFilteredSuppliers] = useState<Company[]>([]); // Removed state
  // const [loading, setLoading] = useState(false); // Removed state
  const navigate = useNavigate();

  // Fetch Suppliers using React Query
  const fetchSuppliers = async (customerId: string): Promise<Company[]> => {
      const { data: relationships, error: relationshipsError } = await supabase
        .from("company_relationships")
        .select("*")
        .eq("customer_id", customerId);

      if (relationshipsError) throw new Error(relationshipsError.message);
      if (!relationships || relationships.length === 0) return [];

      const supplierIds = relationships.map((rel) => rel.supplier_id);
      if (supplierIds.length === 0) return []; // No suppliers to fetch

      const { data: suppliers, error: suppliersError } = await supabase
        .from("companies")
        .select("*")
        .in("id", supplierIds);

      if (suppliersError) throw new Error(suppliersError.message);

      const suppliersWithRelationships = (suppliers || []).map((supplier: CompanyRow) => {
        const relationship = relationships.find(rel => rel.supplier_id === supplier.id);
        return {
          id: supplier.id,
          name: supplier.name,
          contact_name: supplier.contact_name || "",
          contact_email: supplier.contact_email || "",
          contact_phone: supplier.contact_phone || "",
          created_at: supplier.created_at,
          updated_at: supplier.updated_at,
          relationship: relationship ? {
                id: relationship.id,
                customer_id: relationship.customer_id,
                supplier_id: relationship.supplier_id,
                status: relationship.status as RelationshipStatus,
                type: relationship.type as RelationshipType,
                created_at: relationship.created_at,
                updated_at: relationship.updated_at,
            } : undefined,
        } as Company;
      });
      return suppliersWithRelationships;
  };

  const {
      data: filteredSuppliers, // Renamed data to filteredSuppliers for clarity
      isLoading: isLoadingSuppliers,
      error: errorSuppliers,
      refetch: refetchSuppliers,
  } = useQuery<Company[], Error>({
      queryKey: ['suppliers', currentCompany?.id], // Query depends on current company
      queryFn: () => fetchSuppliers(currentCompany!.id),
      enabled: !!currentCompany, // Only run if a company is selected
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      // Removed onError - handle via errorSuppliers state
  });
  // End Fetch Suppliers

  // Add Supplier Mutation
  const addSupplierMutation = useAddSupplierMutation(queryClient);

  const handleSupplierAction = (supplier: Company) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  const canManageSuppliers = !!user; // Anyone logged in can manage suppliers for their company

  const handleInviteSupplier = () => {
    setInviteModalOpen(true);
  };

  const handleAddSupplier = () => {
    if (!currentCompany) {
      toast.error("Please select a company first before adding a supplier.");
      return;
    }
    setIsAddModalOpen(true);
  };

  // Wrapper function to call the mutation
  const handleAddSupplierSubmit = async (data: {
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    relationshipType: RelationshipType;
  }) => {
    if (!currentCompany) {
      toast.error("No company selected");
      return; // Or throw error if modal should handle it
    }
    console.log('Attempting to add supplier for company:', {
      companyId: currentCompany.id,
      companyName: currentCompany.name,
      supplierData: data
    });
    try {
        await addSupplierMutation.mutateAsync({
            ...data,
            customerId: currentCompany.id, // Add customerId
        });
        setIsAddModalOpen(false); // Close modal on success
        // No need to manually refetch here, onSuccess in mutation handles it
    } catch (error) {
        // Error is already handled and toasted within the mutation's onError
        console.error("Mutation failed:", error);
        // Keep modal open on error? Or handle specific errors differently?
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Suppliers"
        subtitle={currentCompany
          ? `Viewing as ${currentCompany.name}`
          : 'Select a company'} // Updated subtitle
        actions={
          <> {/* Keep fragment */}
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting supplier data...")}
            />

            {canManageSuppliers && (
              <PageHeaderAction
                label="Invite Supplier" // Add Invite button
                onClick={handleInviteSupplier}
                icon={<UserPlus className="h-4 w-4" />}
                disabled={isLoadingCompanies || !currentCompany} // Disable if loading or no company
              />
            )}
            {/* Remove Add New Supplier button below */}
            {/* {canManageSuppliers && (
              <PageHeaderAction
                label="Add New Supplier"
                onClick={handleAddSupplier}
                icon={<Plus className="h-4 w-4" />}
                // Disable based on company loading OR if no company is selected
                disabled={isLoadingCompanies || !currentCompany || addSupplierMutation.isPending}
              />
            )} */}
          </>
        }
      />

      {isLoadingCompanies ? ( // Show loading if company context is loading
          <div className="flex items-center justify-center h-64">Loading company data...</div>
      ) : isLoadingSuppliers ? ( // Then show loading if suppliers are loading
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : errorSuppliers ? ( // Handle suppliers query error state
         <div className="border rounded-md p-8 text-center text-red-500">
            Error loading suppliers: {errorSuppliers.message}
         </div>
      ) : filteredSuppliers && filteredSuppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} onClick={handleSupplierAction} />
          ))}
        </div>
      ) : (
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
                {currentCompany ? 'No suppliers found for this company' : 'Please select a company'}
            </h3>
            {currentCompany && ( // Only show prompt if a company is selected
                <>
                    <p className="text-muted-foreground mb-4">
                      Add your first supplier to get started with supplier management.
                    </p>
                    {canManageSuppliers && (
                      <Button
                        onClick={handleAddSupplier}
                        className="gap-2"
                        // Disable based on company loading OR if no company is selected
                        disabled={isLoadingCompanies || !currentCompany || addSupplierMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                        Add Supplier
                      </Button>
                    )}
                </>
            )}
          </div>
        </div>
      )}

      <InviteSupplierModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />

      <AddSupplierModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSupplierSubmit}
        // Pass mutation pending state to modal
        loading={addSupplierMutation.isPending}
      />
    </div>
  );
};

export default Suppliers;
