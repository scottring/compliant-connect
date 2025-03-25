
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import SupplierTable from "@/components/suppliers/SupplierTable";
import InviteSupplierModal from "@/components/suppliers/InviteSupplierModal";
import { Company } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Suppliers"
        subtitle={user?.companyId ? `Viewing as ${user.name} (${companies.find(c => c.id === user.companyId)?.name || 'Unknown Company'})` : 'Admin View'}
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting supplier data...")}
            />
            {canInviteSuppliers && (
              <PageHeaderAction
                label="Invite New Supplier"
                onClick={() => setInviteModalOpen(true)}
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

      <SupplierTable
        suppliers={filteredSuppliers}
        onAction={handleSupplierAction}
      />

      <InviteSupplierModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
    </div>
  );
};

export default Suppliers;
