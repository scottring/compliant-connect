import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; // Use AuthContext
import { supabase } from "@/integrations/supabase/client";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import CustomerTable from "@/components/customers/CustomerTable";
import { Loader2 } from "lucide-react";
import { Company, CompanyUser } from "@/types/index"; // Import necessary types from index file
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Customers = () => {
  const { user: authUser, loading: authLoading } = useAuth(); // Get authenticated user
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [customersToDisplay, setCustomersToDisplay] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserAdminOrUnassigned, setIsUserAdminOrUnassigned] = useState<boolean>(false); // Track if user is admin/unassigned
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Correctly check the boolean property inside authLoading
      if (authLoading.auth || !authUser) {
        if (!authLoading.auth) setIsLoading(false);
        setCustomersToDisplay([]);
        setIsUserAdminOrUnassigned(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setIsUserAdminOrUnassigned(false); // Reset admin flag

      try {
        console.log("Customers: Starting data fetch...");

        // 1. Fetch user's company association(s)
        console.log("Customers: Fetching company_users...");
        const { data: companyUserData, error: companyUserError } = await supabase
          .from('company_users')
          .select('company_id, role') // Get company ID and user's role within that company
          .eq('user_id', authUser.id);
        console.log("Customers: Fetched company_users", { data: companyUserData, error: companyUserError });

        if (companyUserError) {
          throw new Error(companyUserError.message || "Failed to fetch user company association.");
        }

        const primaryAssociation = companyUserData?.[0] as CompanyUser | undefined;
        const userCompanyId = primaryAssociation?.company_id;

        if (!userCompanyId) {
          // Assume admin/unassigned if no direct company link
          console.log("Customers: No company ID found, fetching all companies (admin/unassigned view)...");
          setIsUserAdminOrUnassigned(true); // Set flag for UI logic
          // Admin view: Fetch all companies
          const { data: allCompaniesData, error: allCompaniesError } = await supabase
            .from('companies')
            .select('*');
          console.log("Customers: Fetched all companies for admin/unassigned view", { data: allCompaniesData, error: allCompaniesError });
          if (allCompaniesError) throw allCompaniesError;
          setCustomersToDisplay(allCompaniesData || []);
        } else {
          // User is associated with a company, fetch their customers via relationships
          console.log(`Customers: User associated with company ${userCompanyId}. Fetching their customers...`);
          setIsUserAdminOrUnassigned(false); // User is associated with a company

          // Step 3a: Fetch only the customer IDs from relationships (assuming column is 'customer_id')
          const { data: relIdsData, error: relIdsError } = await supabase
            .from('company_relationships')
            .select('customer_id') // Select the customer's company ID
            .eq('supplier_id', userCompanyId) // Corrected column name
            .eq('status', 'active');
          console.log("Customers: Fetched relationship IDs", { data: relIdsData, error: relIdsError });

          if (relIdsError) throw relIdsError;

          // Extract IDs using the assumed column name 'customer_id'
          const customerIds = relIdsData?.map(rel => rel.customer_id).filter(Boolean) as string[] || [];

          // Step 3b: If customer IDs exist, fetch their company details
          if (customerIds.length > 0) {
            console.log("Customers: Fetching details for customer IDs:", customerIds);
            const { data: customerDetailsData, error: customerDetailsError } = await supabase
              .from('companies')
              .select('*')
              .in('id', customerIds);
            console.log("Customers: Fetched customer details", { data: customerDetailsData, error: customerDetailsError });

            if (customerDetailsError) throw customerDetailsError;
            setCustomersToDisplay(customerDetailsData || []);
          } else {
            console.log("Customers: No active customer relationships found.");
            setCustomersToDisplay([]); // No related customers found
          }
        }
        console.log("Customers: Data fetch logic completed.");
      } catch (err: any) {
        console.error("Customers: Error during data fetch:", err);
        setError("Failed to load customer data.");
        toast.error("Failed to load customer data.");
        setCustomersToDisplay([]);
      } finally {
        console.log("Customers: Setting isLoading to false.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [authUser, authLoading]);

  const handleCustomerAction = (customer: Company) => {
    navigate(`/customers/${customer.id}`);
  };

  // Determine if the current user can add customers
  // Admins/unassigned users can add. Users associated with a company might also be allowed depending on app logic.
  const canAddCustomers = isUserAdminOrUnassigned || !!(authUser); // Simplified: Allow if admin or associated with any company

  const handleAddCustomer = () => {
    toast.info("Open the Add/Invite Customer modal (Implementation Pending)");
    // setInviteModalOpen(true);
  };

  // Loading state for authentication
  if (authLoading.auth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" /> Authenticating...
      </div>
    );
  }

  // No authenticated user state
  if (!authUser) {
    return (
      <div className="space-y-6">
        <PageHeader title="Our Customers" subtitle="Please log in to view customers." />
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Not Logged In</h3>
            <p className="text-muted-foreground mb-4">You need to be logged in to access this page.</p>
            {/* <Button onClick={() => navigate('/auth')}>Log In</Button> */}
          </div>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Customers"
        subtitle={`Viewing customer relationships`}
        actions={
          <>
            <PageHeaderAction label="Export Data" variant="outline" onClick={() => toast.info("Exporting customer data...")} />
            {canAddCustomers && (
              <PageHeaderAction
                label="Add New Customer"
                onClick={handleAddCustomer}
                icon={<Plus className="h-4 w-4" />}
              />
            )}
          </>
        }
      />

      {/* Loading state for customer data */}
      {isLoading && (
        <div className="border rounded-md p-8 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          Loading customers...
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="border rounded-md p-8 text-center text-red-600">
          Error: {error}
        </div>
      )}

      {/* Customer Table or No Customers Message */}
      {!isLoading && !error && customersToDisplay.length > 0 && (
        <CustomerTable customers={customersToDisplay} onAction={handleCustomerAction} />
      )}
      {!isLoading && !error && customersToDisplay.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No customers found</h3>
            <p className="text-muted-foreground mb-4">
              {isUserAdminOrUnassigned
                ? "No companies found." // Admin/Unassigned view
                : "No customers are currently linked to your account."} {/* Supplier view */}
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

      {/* TODO: Implement InviteCustomerModal */}
      {/* <InviteCustomerModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} /> */}
    </div>
  );
};

export default Customers;
