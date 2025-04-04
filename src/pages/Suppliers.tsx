import React, { useState } from "react";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import InviteSupplierModal from "@/components/suppliers/InviteSupplierModal";
import { Company, RelationshipType, RelationshipStatus } from "@/types/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Database } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useCompanyData } from "@/hooks/use-company-data";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { SupplierCard } from "@/components/suppliers/SupplierCard";
import { AddSupplierModal } from "@/components/suppliers/AddSupplierModal";
import { EditSupplierModal } from "@/components/suppliers/EditSupplierModal.tsx"; // Explicitly add extension

type CompanyRow = Database['public']['Tables']['companies']['Row'];
type RelationshipRow = Database['public']['Tables']['company_relationships']['Row'];

// --- Type Definitions ---
type AddSupplierInput = {
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    relationshipType: RelationshipType;
    customerId: string;
};

type UpdateSupplierInput = {
    id: string;
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    relationshipType: RelationshipType;
    customerId: string;
};

type DeleteSupplierInput = {
    supplierId: string;
    customerId: string;
};


// --- Custom Mutation Hooks (Remain outside component) ---

const useAddSupplierMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<Company, Error, AddSupplierInput> => {
    return useMutation<Company, Error, AddSupplierInput>({
        mutationFn: async (data) => {
            const { data: customerCompany, error: customerError } = await supabase.from('companies').select('id, name').eq('id', data.customerId).limit(1).maybeSingle();
            if (customerError) throw new Error(`Error finding customer company: ${customerError.message}`);
            if (!customerCompany) throw new Error(`Customer company not found with ID: ${data.customerId}`);

            const { data: newSupplier, error: supplierError } = await supabase.from('companies').insert({ name: data.name, contact_name: data.contactName, contact_email: data.contactEmail, contact_phone: data.contactPhone }).select().single();
            if (supplierError) throw new Error(`Error creating supplier: ${supplierError.message}`);
            if (!newSupplier) throw new Error("Failed to create supplier: No data returned.");

            const { error: relationshipError } = await supabase.from('company_relationships').insert({ customer_id: data.customerId, supplier_id: newSupplier.id, status: 'pending', type: data.relationshipType });
            if (relationshipError) {
                await supabase.from('companies').delete().eq('id', newSupplier.id);
                throw new Error(`Error creating relationship: ${relationshipError.message}`);
            }
            return newSupplier as Company;
        },
        onSuccess: (data, variables) => { queryClient.invalidateQueries({ queryKey: ['suppliers', variables.customerId] }); toast.success("Supplier added successfully"); },
        onError: (error) => { toast.error(`Failed to add supplier: ${error.message}`); },
    });
};

const useUpdateSupplierMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<Company, Error, UpdateSupplierInput> => {
    return useMutation<Company, Error, UpdateSupplierInput>({
        mutationFn: async (data) => {
            const { data: updatedSupplier, error: companyUpdateError } = await supabase.from('companies').update({ name: data.name, contact_name: data.contactName, contact_email: data.contactEmail, contact_phone: data.contactPhone }).eq('id', data.id).select().single();
            if (companyUpdateError) throw new Error(`Error updating supplier company: ${companyUpdateError.message}`);
            if (!updatedSupplier) throw new Error("Failed to update supplier: No data returned.");

            const { data: relationship, error: findRelError } = await supabase.from('company_relationships').select('id, type').eq('customer_id', data.customerId).eq('supplier_id', data.id).maybeSingle();
            if (findRelError) {
                 // Handle error finding relationship (e.g., log it, but maybe don't block supplier update)
                 console.error(`Warning: Error finding relationship during supplier update: ${findRelError.message}`);
            } else if (relationship && relationship.type !== data.relationshipType) {
                 // Only update relationship type if found and different
                const { error: updateRelError } = await supabase.from('company_relationships').update({ type: data.relationshipType }).eq('id', relationship.id);
                if (updateRelError) {
                    // Log warning but don't necessarily throw, as company update succeeded
                    console.error(`Warning: Failed to update relationship type: ${updateRelError.message}`);
                }
            } // Added missing closing brace for the outer if/else if

            return updatedSupplier as Company;
        },
        onSuccess: (data, variables) => { queryClient.invalidateQueries({ queryKey: ['suppliers', variables.customerId] }); toast.success("Supplier updated successfully"); },
        onError: (error) => { toast.error(`Failed to update supplier: ${error.message}`); },
    });
};

const useDeleteSupplierRelationshipMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<void, Error, DeleteSupplierInput> => {
    return useMutation<void, Error, DeleteSupplierInput>({
        mutationFn: async (data) => {
            const { data: relationship, error: findError } = await supabase.from('company_relationships').select('id').eq('customer_id', data.customerId).eq('supplier_id', data.supplierId).maybeSingle();
            if (findError) throw new Error(`Error finding relationship to delete: ${findError.message}`);
            if (!relationship) { return; }

            const { error: deleteError } = await supabase.from('company_relationships').delete().eq('id', relationship.id);
            if (deleteError) throw new Error(`Error deleting relationship: ${deleteError.message}`);
            },
        onSuccess: (data, variables) => { queryClient.invalidateQueries({ queryKey: ['suppliers', variables.customerId] }); toast.success("Supplier relationship deleted successfully"); },
        onError: (error) => { toast.error(`Failed to delete supplier relationship: ${error.message}`); },
    });
};
// --- End Delete Supplier Relationship Mutation Hook ---


// --- Component Definition ---
const Suppliers = () => {
  // --- Hooks ---
  const { user } = useAuth();
  const { currentCompany, isLoadingCompanies } = useCompanyData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // --- State ---
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Company | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Company | null>(null);

  // --- Data Fetching ---
  const fetchSuppliers = async (customerId: string): Promise<Company[]> => {
      const { data: relationships, error: relationshipsError } = await supabase.from("company_relationships").select("*").eq("customer_id", customerId);
      if (relationshipsError) throw new Error(relationshipsError.message);
      if (!relationships || relationships.length === 0) return [];

      const supplierIds = relationships.map((rel) => rel.supplier_id);
      if (supplierIds.length === 0) return [];

      const { data: suppliers, error: suppliersError } = await supabase.from("companies").select("*").in("id", supplierIds);
      if (suppliersError) throw new Error(suppliersError.message);

      const suppliersWithRelationships = (suppliers || []).map((supplier: CompanyRow) => {
        const relationship = relationships.find(rel => rel.supplier_id === supplier.id);
        return {
          id: supplier.id, name: supplier.name, contact_name: supplier.contact_name || "", contact_email: supplier.contact_email || "", contact_phone: supplier.contact_phone || "", created_at: supplier.created_at, updated_at: supplier.updated_at,
          relationship: relationship ? { id: relationship.id, customer_id: relationship.customer_id, supplier_id: relationship.supplier_id, status: relationship.status as RelationshipStatus, type: relationship.type as RelationshipType, created_at: relationship.created_at, updated_at: relationship.updated_at } : undefined,
        } as Company;
      });
      return suppliersWithRelationships;
  };

  const { data: filteredSuppliers, isLoading: isLoadingSuppliers, error: errorSuppliers } = useQuery<Company[], Error>({
      queryKey: ['suppliers', currentCompany?.id],
      queryFn: () => fetchSuppliers(currentCompany!.id),
      enabled: !!currentCompany,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
  });

  // --- Mutations ---
  const addSupplierMutation = useAddSupplierMutation(queryClient);
  const updateSupplierMutation = useUpdateSupplierMutation(queryClient);
  const deleteSupplierRelationshipMutation = useDeleteSupplierRelationshipMutation(queryClient); // Instantiate delete mutation

  // --- Handlers ---
  const handleSupplierAction = (supplier: Company) => navigate(`/suppliers/${supplier.id}`);
  const handleInviteSupplier = () => setInviteModalOpen(true);

  const handleAddSupplier = () => {
    if (!currentCompany) { toast.error("Please select a company first."); return; }
    setIsAddModalOpen(true);
  };

  const handleAddSupplierSubmit = async (data: Omit<AddSupplierInput, 'customerId'>) => {
    if (!currentCompany) { toast.error("No company selected"); return; }
    try {
        await addSupplierMutation.mutateAsync({ ...data, customerId: currentCompany.id });
        setIsAddModalOpen(false);
    } catch (error) { }
  };

  const handleEditSupplier = (supplier: Company) => {
    setEditingSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleEditSupplierSubmit = async (data: Omit<UpdateSupplierInput, 'id' | 'customerId'>) => {
    if (!editingSupplier || !currentCompany) { toast.error("Cannot update supplier: Missing context."); return; }
    try {
      await updateSupplierMutation.mutateAsync({ ...data, id: editingSupplier.id, customerId: currentCompany.id });
      setIsEditModalOpen(false);
      setEditingSupplier(null);
    } catch (error) { }
  };

  const handleDeleteSupplier = (supplier: Company) => {
    setDeletingSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => { // Updated delete confirmation handler
    if (!deletingSupplier || !currentCompany) { toast.error("Cannot delete supplier: Missing context."); return; }
    try {
      await deleteSupplierRelationshipMutation.mutateAsync({ supplierId: deletingSupplier.id, customerId: currentCompany.id });
      // Success toast is handled by the mutation hook
    } catch (error) {
      // Error toast is handled by the mutation hook
      // Log if mutateAsync itself throws
    } finally {
       setDeletingSupplier(null);
       setIsDeleteDialogOpen(false);
    }
  };

  // --- Render Logic ---
  const canManageSuppliers = !!user;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Suppliers"
        subtitle={currentCompany ? `Viewing as ${currentCompany.name}` : 'Select a company'}
        actions={
          <>
            <PageHeaderAction label="Export Data" variant="outline" onClick={() => toast.info("Exporting supplier data...")} />
            {canManageSuppliers && <PageHeaderAction label="Invite Supplier" onClick={handleInviteSupplier} icon={<UserPlus className="h-4 w-4" />} disabled={isLoadingCompanies || !currentCompany} />}
          </>
        }
      />

      {/* Loading/Error/Content States */}
      {isLoadingCompanies ? ( <div className="flex items-center justify-center h-64">Loading company data...</div> )
      : isLoadingSuppliers ? ( <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div> )
      : errorSuppliers ? ( <div className="border rounded-md p-8 text-center text-red-500">Error loading suppliers: {errorSuppliers.message}</div> )
      : filteredSuppliers && filteredSuppliers.length > 0 ? (
        // Display Supplier Cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} onClick={handleSupplierAction} onEdit={handleEditSupplier} onDelete={handleDeleteSupplier} />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{currentCompany ? 'No suppliers found' : 'Please select a company'}</h3>
            {currentCompany && ( <>
              <p className="text-muted-foreground mb-4">Add your first supplier to get started.</p>
              {canManageSuppliers && <Button onClick={handleInviteSupplier} className="gap-2" disabled={isLoadingCompanies || !currentCompany}><UserPlus className="h-4 w-4" /> Invite Supplier</Button>}
            </>)}
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteSupplierModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
      <AddSupplierModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSupplierSubmit} loading={addSupplierMutation.isPending} />
      <EditSupplierModal open={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingSupplier(null); }} onSubmit={handleEditSupplierSubmit} loading={updateSupplierMutation.isPending} supplier={editingSupplier} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the relationship with "{deletingSupplier?.name || 'this supplier'}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSupplier(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700" disabled={deleteSupplierRelationshipMutation.isPending}>
              {deleteSupplierRelationshipMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Suppliers;
