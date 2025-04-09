import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompanyData } from '@/hooks/use-company-data';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { List, CheckSquare, Users, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionItemProps {
  count: number;
  label: string;
  link: string;
  icon: React.ReactNode;
}

const ActionItem: React.FC<ActionItemProps> = ({ count, label, link, icon }) => {
  if (count === 0) return null; // Don't show if count is zero

  return (
    <Link to={link} className="block hover:bg-muted/50 rounded-lg transition-colors duration-150 p-3 border mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-3 text-primary">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
    </Link>
  );
};

const fetchActionItemsData = async (companyId: string) => { // Removed role parameter
  if (!companyId) { // Check only for companyId
    return {
      pirsToReview: 0,
      pendingSuppliers: 0,
      pirsToRespond: 0,
    };
  }

  let pirsToReview = 0;
  let pendingSuppliers = 0;
  let pirsToRespond = 0;

  // --- Fetch Customer-Perspective Counts ---

  // Fetch PIRs needing review (submitted or in_review) by this company as customer
    // Fetch PIRs needing review (submitted or in_review)
  const { count: reviewCount, error: reviewError } = await supabase
    .from('pir_requests')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', companyId)
    .in('status', ['submitted', 'in_review']);
    if (reviewError) console.error("Error fetching PIRs to review:", reviewError);
    pirsToReview = reviewCount ?? 0;

  // Fetch pending supplier relationships initiated by this company as customer
  const { count: supplierCount, error: supplierError } = await supabase
    .from('company_relationships')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', companyId)
    .eq('status', 'pending'); // Assuming 'pending' status for invites
    if (supplierError) console.error("Error fetching pending suppliers:", supplierError);
  pendingSuppliers = supplierCount ?? 0;

  // --- Fetch Supplier-Perspective Counts ---
  // Fetch PIRs needing response where this company is the supplier
    // Fetch PIRs needing response (pending or flagged)
  const { count: responseCount, error: responseError } = await supabase
    .from('pir_requests')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_company_id', companyId)
    .in('status', ['pending', 'flagged']); // Assuming 'pending' or 'flagged' status requires response
    if (responseError) console.error("Error fetching PIRs to respond:", responseError);
  pirsToRespond = responseCount ?? 0;
  // Removed extra closing brace from previous diff here
  // Removed extra closing brace here

  return {
    pirsToReview,
    pendingSuppliers,
    pirsToRespond,
  };
};


const ActionItemsList = () => {
  const { user } = useAuth();
  const { userCompanies, currentCompany, isLoadingCompanies } = useCompanyData(); // Use isLoadingCompanies

  // Derive currentRole from userCompanies and currentCompany
  const currentRole = React.useMemo(() => {
    if (!currentCompany || !userCompanies) return null;
    const companyData = userCompanies.find(uc => uc.id === currentCompany.id);
    return companyData?.userRole ?? null;
  }, [currentCompany, userCompanies]);

  const { data: actionItemsData, isLoading: isLoadingActionItems, error } = useQuery({
    queryKey: ['dashboardActionItems', currentCompany?.id], // Removed currentRole from key
    queryFn: () => fetchActionItemsData(currentCompany!.id), // Pass only companyId
    enabled: !!currentCompany && !isLoadingCompanies, // Enable when company is loaded
  });

  const isLoading = isLoadingCompanies || isLoadingActionItems; // Use isLoadingCompanies

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <List className="mr-2 h-5 w-5" />
          Action Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading action items...
          </div>
        ) : error ? (
          <div className="flex items-center p-4 text-red-600">
            <AlertCircle className="mr-2 h-4 w-4" />
            Error loading action items.
          </div>
        ) : !actionItemsData || (actionItemsData.pirsToReview === 0 && actionItemsData.pendingSuppliers === 0 && actionItemsData.pirsToRespond === 0) ? ( // Check if all counts are zero
           <p className="text-sm text-muted-foreground p-4 text-center">No pending action items.</p>
        ) : (
          <div>
            {/* Display all relevant action items. The ActionItem component handles hiding itself if count is 0. */}
                <ActionItem
                  count={actionItemsData.pirsToReview}
                  label="PIRs Ready for Review"
                  link="/product-sheets" // Link to outgoing PIRs page
                  icon={<CheckSquare className="h-4 w-4" />}
                />
                <ActionItem
                  count={actionItemsData.pendingSuppliers}
                  label="Pending Supplier Invites"
                  link="/suppliers"
                  icon={<Users className="h-4 w-4" />}
                />
            <ActionItem
                count={actionItemsData.pirsToRespond}
                label="PIRs Requiring Response"
                link="/our-products" // Link to supplier incoming PIRs page
                icon={<AlertCircle className="h-4 w-4" />}
              />
            {/* Removed extra self-closing tag from here */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionItemsList;