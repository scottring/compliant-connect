import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import SupplierTable from "@/components/suppliers/SupplierTable";
import InviteSupplierModal from "@/components/suppliers/InviteSupplierModal";
import { Company, RelationshipType, SupplierRelationship } from "@/types/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAllData } from "@/utils/resetData";
import { supabase } from "@/integrations/supabase/client";
import { Database } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { SupplierCard } from "@/components/suppliers/SupplierCard";
import { AddSupplierModal } from "@/components/suppliers/AddSupplierModal";

type CompanyRow = Database['public']['Tables']['companies']['Row'];
type RelationshipRow = Database['public']['Tables']['company_relationships']['Row'];

const Suppliers = () => {
  const { user, currentCompany, refreshUserData, userCompanies } = useAuth();
  const { companies } = useApp();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadSuppliers = useCallback(async () => {
    if (!currentCompany) {
      setFilteredSuppliers([]);
      return;
    }

    try {
      setLoading(true);

      // First, get all relationships where current company is the customer
      const { data: relationships, error: relationshipsError } = await supabase
        .from("company_relationships")
        .select("*")
        .eq("customer_id", currentCompany.id);

      if (relationshipsError) {
        toast.error("Error loading supplier relationships");
        console.error("Error:", relationshipsError);
        return;
      }

      if (!relationships.length) {
        setFilteredSuppliers([]);
        return;
      }

      // Get all supplier IDs from relationships
      const supplierIds = relationships.map((rel) => rel.supplier_id);

      // Fetch all suppliers
      const { data: suppliers, error: suppliersError } = await supabase
        .from("companies")
        .select("*")
        .in("id", supplierIds);

      if (suppliersError) {
        toast.error("Error loading suppliers");
        console.error("Error:", suppliersError);
        return;
      }

      // Transform supplier data to include relationship information
      const suppliersWithRelationships = suppliers.map((supplier: CompanyRow) => {
        const relationship = relationships.find(
          (rel) => rel.supplier_id === supplier.id
        );

        return {
          id: supplier.id,
          name: supplier.name,
          role: supplier.role as "supplier" | "customer" | "both",
          contactName: supplier.contact_name || "",
          contactEmail: supplier.contact_email || "",
          contactPhone: supplier.contact_phone || "",
          progress: supplier.progress,
          createdAt: supplier.created_at,
          updatedAt: supplier.updated_at,
          relationship: relationship
            ? {
                id: relationship.id,
                customerId: relationship.customer_id,
                supplierId: relationship.supplier_id,
                status: relationship.status,
                type: relationship.type,
                createdAt: relationship.created_at,
                updatedAt: relationship.updated_at,
              }
            : undefined,
        };
      });

      setFilteredSuppliers(suppliersWithRelationships);
    } catch (error) {
      console.error("Error in loadSuppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [currentCompany]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleSupplierAction = (supplier: Company) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  // Anyone can add suppliers, since all company types can have supplier relationships
  const canManageSuppliers = !!user;

  const handleInviteSupplier = () => {
    setInviteModalOpen(true);
  };
  
  const handleAddSupplier = () => {
    setIsAddModalOpen(true);
  };
  
  const handleAddSupplierSubmit = async (data: {
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    relationshipType: RelationshipType;
  }) => {
    console.log("Current company state:", currentCompany);
    console.log("User companies:", userCompanies);
    
    if (!currentCompany) {
      console.error("No company selected - userCompanies:", userCompanies);
      toast.error("No company selected");
      throw new Error("No company selected");
    }

    try {
      setLoading(true);

      // Insert the new supplier
      const { data: newSupplier, error: supplierError } = await supabase
        .from("companies")
        .insert({
          name: data.name,
          role: "supplier",
          contact_name: data.contactName,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone,
          progress: 0,
        })
        .select()
        .single();

      if (supplierError) {
        toast.error("Error creating supplier");
        console.error("Error:", supplierError);
        throw supplierError;
      }

      // Create the relationship
      const { error: relationshipError } = await supabase
        .from("company_relationships")
        .insert({
          customer_id: currentCompany.id,
          supplier_id: newSupplier.id,
          status: "pending",
          type: data.relationshipType,
        });

      if (relationshipError) {
        toast.error("Error creating relationship");
        console.error("Error:", relationshipError);
        // Try to clean up the supplier
        await supabase.from("companies").delete().eq("id", newSupplier.id);
        throw relationshipError;
      }

      toast.success("Supplier added successfully");
      setIsAddModalOpen(false);
      loadSuppliers();
    } catch (error) {
      console.error("Error in handleAddSupplierSubmit:", error);
      toast.error("Failed to add supplier");
      throw error; // Re-throw the error so the modal can catch it
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Suppliers"
        subtitle={currentCompany 
          ? `Viewing as ${currentCompany.name}`
          : 'All Suppliers'}
        actions={
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <PageHeaderAction
                  label="Reset All Data"
                  variant="destructive"
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all application data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all suppliers, product sheets, questions, tags, and other data. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Reset Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting supplier data...")}
            />
            
            {canManageSuppliers && (
              <PageHeaderAction
                label="Add New Supplier"
                onClick={handleAddSupplier}
                icon={<Plus className="h-4 w-4" />}
              />
            )}
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredSuppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>
      ) : (
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No suppliers found</h3>
            <p className="text-muted-foreground mb-4">
              Add your first supplier to get started with supplier management.
            </p>
            {canManageSuppliers && (
              <Button onClick={handleAddSupplier} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Supplier
              </Button>
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
        loading={loading}
      />
    </div>
  );
};

export default Suppliers;
