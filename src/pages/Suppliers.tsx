
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import SupplierTable from "@/components/suppliers/SupplierTable";
import InviteSupplierModal from "@/components/suppliers/InviteSupplierModal";
import { Company } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Suppliers = () => {
  const { companies, addCompany } = useApp();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const navigate = useNavigate();

  const suppliers = companies.filter(
    (company) => company.role === "supplier" || company.role === "both"
  );

  const handleSupplierAction = (supplier: Company) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Suppliers"
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting supplier data...")}
            />
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
          </>
        }
      />

      <SupplierTable
        suppliers={suppliers}
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
