
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // Use Auth context
import { useCompanyData } from "@/hooks/use-company-data"; // Use company data hook
import { useQuery } from '@tanstack/react-query'; // Import query hook
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import CustomerTable from "@/components/customers/CustomerTable";
import { Company } from "@/types/auth"; // Assuming Company type is here now
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus } from "lucide-react";

const Customers = () => {
  const { user } = useAuth(); // Get user from AuthContext
  const { currentCompany, isLoadingCompanies } = useCompanyData(); // Get current company
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  // Remove old state based on context
  // const [filteredCustomers, setFilteredCustomers] = useState<Company[]>([]);
  const navigate = useNavigate();

  // --- Data Fetching with React Query ---
  // Define the shape of the data returned by the query (reflecting TS inference)
  type RelationshipWithCustomer = {
    customer: Company | null // Correct type based on actual query result
  }

  const fetchCustomers = async (supplierId: string): Promise<Company[]> => {
    const { data, error } = await supabase
      .from('company_relationships')
      .select(`
        customer:customer_id (
          id, name, contact_name, contact_email, contact_phone, created_at, updated_at
        )
      `) // Simplified join syntax
      .eq('supplier_id', supplierId)
      .eq('status', 'active'); // Only show active relationships? Adjust if needed

    if (error) {
      console.error("Error fetching customers:", error);
      throw new Error(`Failed to load customers: ${error.message}`);
    }

    // Explicitly type the fetched data based on TS inference
    // Cast raw data to any[] to bypass TS inference issues, then process
    const rawData = (data || []) as any[];

    // Map to extract the customer object
    const mappedCustomers = rawData.map(item => item.customer as Company | null);

    // Filter out any nulls
    const filteredCustomers = mappedCustomers.filter((c): c is Company => c !== null);

    return filteredCustomers;
  };

  const {
    data: customers,
    isLoading: isLoadingCustomers,
    error: errorCustomers
  } = useQuery<Company[], Error>({
    queryKey: ['customers', currentCompany?.id],
    queryFn: () => fetchCustomers(currentCompany!.id),
    enabled: !!currentCompany, // Only run query if currentCompany is loaded
  });
  // --- End Data Fetching ---

  const handleCustomerAction = (customer: Company) => {
    navigate(`/customers/${customer.id}`);
  };

  // Check if user is allowed to add customers
  // TODO: Re-evaluate canAddCustomers logic based on new data structure if needed
  // For now, assume only admins or non-customer roles can add? This might need adjustment.
  const canAddCustomers = !!user; // Simplified for now, adjust later

  const handleAddCustomer = () => {
    toast.info("Open the Add/Invite Customer modal");
    setInviteModalOpen(true);
  };

  // If there's no user selected yet, show a message
  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Our Customers"
          subtitle="Please select a user to continue"
        />
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No user selected</h3>
            <p className="text-muted-foreground mb-4">
              Please use the user switcher in the top right to select a user first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Customers"
        subtitle={currentCompany ? `Customers related to ${currentCompany.name}` : 'Select a company'}
        actions={
          <>
            <PageHeaderAction
              label="Export Data"
              variant="outline"
              onClick={() => toast.info("Exporting customer data...")}
            />
            {/* TODO: Re-enable Add Customer functionality if needed */}
            {/* {canAddCustomers && (
              <PageHeaderAction
                label="Add New Customer" // Or "Invite Customer"
                onClick={handleAddCustomer}
                icon={<Plus className="h-4 w-4" />}
              />
            )} */}
          </>
        }
      />

      {isLoadingCompanies || isLoadingCustomers ? (
         <div className="text-center p-8">Loading...</div>
      ) : errorCustomers ? (
         <div className="text-center p-8 text-red-500">Error: {errorCustomers.message}</div>
      ) : customers && customers.length > 0 ? (
        <CustomerTable
          customers={customers} // Use data from useQuery
          onAction={handleCustomerAction} // Keep existing action handler
        />
      ) : (
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No customers found</h3>
            <p className="text-muted-foreground mb-4">No companies have added you as a supplier yet.</p>
            {/* Add button might not be relevant here if customers are added via invites */}
            {/* {canAddCustomers && (
              <Button onClick={handleAddCustomer} className="gap-2">
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            )} */}
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
