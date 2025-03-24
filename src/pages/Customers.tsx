
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import CustomerTable from "@/components/customers/CustomerTable";
import { Company } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Customers = () => {
  const { companies, addCompany } = useApp();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const navigate = useNavigate();

  // Filter companies to only include customers
  const customers = companies.filter(
    (company) => company.role === "customer" || company.role === "both"
  );

  const handleCustomerAction = (customer: Company) => {
    navigate(`/customers/${customer.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Customers"
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting customer data...")}
            />
            <PageHeaderAction
              label="Add New Customer"
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

      <CustomerTable
        customers={customers}
        onAction={handleCustomerAction}
      />

      {/* Modal to be implemented later */}
      {/* <InviteCustomerModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      /> */}
    </div>
  );
};

export default Customers;
