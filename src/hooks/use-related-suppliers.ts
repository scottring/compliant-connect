import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/supabase';

// Define Company based on generated types
type Company = Database['public']['Tables']['companies']['Row'];

// Function to fetch suppliers related to a customer company
const fetchRelatedSuppliers = async (customerId: string): Promise<Company[]> => {
  if (!customerId) return [];

  // 1. Find approved supplier relationships for the customer
  const { data: relationships, error: relError } = await supabase
    .from('company_relationships')
    .select('supplier_id')
    .eq('customer_id', customerId);
    // .eq('status', 'approved'); // REMOVED: Fetch regardless of status for selection purposes

  if (relError) {
    console.error('Error fetching company relationships:', relError);
    throw new Error(`Failed to load supplier relationships: ${relError.message}`);
  }

  if (!relationships || relationships.length === 0) {
    return []; // No approved suppliers found
  }

  const supplierIds = relationships.map(rel => rel.supplier_id);

  // 2. Fetch company details for the found supplier IDs
  const { data: suppliersData, error: compError } = await supabase
    .from('companies')
    .select('*')
    .in('id', supplierIds);

  if (compError) {
    console.error('Error fetching supplier companies:', compError);
    throw new Error(`Failed to load supplier details: ${compError.message}`);
  }

  return (suppliersData || []) as Company[];
};

// Custom hook to use the fetch function
export const useRelatedSuppliers = (customerId: string | undefined) => {
  return useQuery<Company[], Error>({
    queryKey: ['relatedSuppliers', customerId],
    queryFn: () => fetchRelatedSuppliers(customerId!),
    enabled: !!customerId, // Only run query if customerId is available
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Garbage collect after 15 minutes
  });
};