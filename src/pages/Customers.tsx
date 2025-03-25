
import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import CustomerTable from "@/components/customers/CustomerTable";
import { Company } from "@/types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Customers = () => {
  const { companies, addCompany, user } = useApp();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Company[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Find the current user's company
    const userCompany = companies.find(company => company.id === user.companyId);
    
    if (!userCompany) {
      // If no company is found, show all customers (admin view)
      setFilteredCustomers(companies.filter(
        (company) => company.role === "customer" || company.role === "both"
      ));
      return;
    }

    if (userCompany.role === "customer") {
      // Customers should not see other customers
      setFilteredCustomers([]);
    } else if (userCompany.role === "supplier" || userCompany.role === "both") {
      // Suppliers should see customers, but in a real app this would be
      // filtered to only show related customers
      setFilteredCustomers(companies.filter(
        (company) => (company.role === "customer" || company.role === "both") && company.id !== userCompany.id
      ));
    } else {
      // Default case (admin)
      setFilteredCustomers(companies.filter(
        (company) => company.role === "customer" || company.role === "both"
      ));
    }
  }, [companies, user]);

  const handleCustomerAction = (customer: Company) => {
    navigate(`/customers/${customer.id}`);
  };

  // Check if user is allowed to add customers
  const canAddCustomers = user && (
    user.role === "admin" || 
    (user.companyId && companies.find(c => c.id === user.companyId)?.role !== "customer")
  );

  const handleAddCustomer = () => {
    toast.info("Open the Add/Invite Customer modal");
    setInviteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Customers"
        subtitle={user?.companyId ? `Viewing as ${user.name} (${companies.find(c => c.id === user.companyId)?.name || 'Unknown Company'})` : 'Admin View'}
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting customer data...")}
            />
            {canAddCustomers && (
              <PageHeaderAction
                label="Add New Customer"
                onClick={handleAddCustomer}
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

      {filteredCustomers.length > 0 ? (
        <CustomerTable
          customers={filteredCustomers}
          onAction={handleCustomerAction}
        />
      ) : (
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No customers found</h3>
            <p className="text-muted-foreground mb-4">
              {user && companies.find(c => c.id === user.companyId)?.role === "customer" 
                ? "As a customer, you don't have access to view other customers."
                : "Add your first customer to get started."}
            </p>
            {canAddCustomers && (
              <Button onClick={handleAddCustomer} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Modal to be implemented later */}
      {/* <InviteCustomerModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      /> */}
    </div>
  );
};

export default Customers;
