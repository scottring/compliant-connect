
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import SupplierTable from "@/components/suppliers/SupplierTable";
import AddSupplierModal from "@/components/suppliers/AddSupplierModal";
import { Company } from "@/types";
import { toast } from "sonner";

const Suppliers = () => {
  const { companies, addCompany } = useApp();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const suppliers = companies.filter(
    (company) => company.role === "supplier" || company.role === "both"
  );

  const handleAddSupplier = (data: Omit<Company, "id" | "progress">) => {
    addCompany(data);
  };

  const handleSupplierAction = (supplier: Company) => {
    toast.info(`Viewing details for ${supplier.name}`);
    // In a real application, this would navigate to the supplier detail page
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
              label="Add New Supplier"
              onClick={() => setAddModalOpen(true)}
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

      <AddSupplierModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddSupplier}
      />
    </div>
  );
};

export default Suppliers;
