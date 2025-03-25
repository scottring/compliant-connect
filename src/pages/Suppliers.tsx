
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import SupplierTable from "@/components/suppliers/SupplierTable";
import InviteSupplierModal from "@/components/suppliers/InviteSupplierModal";
import { Company } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetAllData } from "@/utils/resetData";
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

const Suppliers = () => {
  const { companies, addCompany, user } = useApp();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Company[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Find the current user's company
    const userCompany = companies.find(company => company.id === user.companyId);
    
    if (!userCompany) {
      // If no company is found, show all suppliers (admin view)
      setFilteredSuppliers(companies.filter(
        (company) => company.role === "supplier" || company.role === "both"
      ));
      return;
    }

    if (userCompany.role === "supplier") {
      // Suppliers should not see other suppliers
      setFilteredSuppliers([]);
    } else if (userCompany.role === "customer" || userCompany.role === "both") {
      // Customers should see suppliers, but in a real app this would be
      // filtered to only show related suppliers
      setFilteredSuppliers(companies.filter(
        (company) => (company.role === "supplier" || company.role === "both") && company.id !== userCompany.id
      ));
    } else {
      // Default case (admin)
      setFilteredSuppliers(companies.filter(
        (company) => company.role === "supplier" || company.role === "both"
      ));
    }
  }, [companies, user]);

  const handleSupplierAction = (supplier: Company) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  // Check if user is allowed to invite suppliers
  const canInviteSuppliers = user && (
    user.role === "admin" || 
    (user.companyId && companies.find(c => c.id === user.companyId)?.role !== "supplier")
  );

  const handleInviteSupplier = () => {
    setInviteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Suppliers"
        subtitle={user?.companyId ? `Viewing as ${user.name} (${companies.find(c => c.id === user.companyId)?.name || 'Unknown Company'})` : 'Admin View'}
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
            
            {canInviteSuppliers && (
              <PageHeaderAction
                label="Invite New Supplier"
                onClick={handleInviteSupplier}
                icon={
                  <svg
                    className="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                }
              />
            )}
          </>
        }
      />

      {filteredSuppliers.length > 0 ? (
        <SupplierTable
          suppliers={filteredSuppliers}
          onAction={handleSupplierAction}
        />
      ) : (
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No suppliers found</h3>
            <p className="text-muted-foreground mb-4">
              {user && companies.find(c => c.id === user.companyId)?.role === "supplier" 
                ? "As a supplier, you don't have access to view other suppliers."
                : "Invite your first supplier to get started."}
            </p>
            {canInviteSuppliers && (
              <Button onClick={handleInviteSupplier} className="gap-2">
                <Plus className="h-4 w-4" />
                Invite Supplier
              </Button>
            )}
          </div>
        </div>
      )}

      <InviteSupplierModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
    </div>
  );
};

export default Suppliers;
