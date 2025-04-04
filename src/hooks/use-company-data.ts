import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
// Use the generated Database type for Company structure
import { Database } from '@/types/supabase';
import { UserRole } from '@/types/auth'; // Keep UserRole if used
import { toast } from 'sonner';

// Define Company based on generated types
type Company = Database['public']['Tables']['companies']['Row'];
// Define UserCompany by adding userRole
export interface UserCompany extends Company {
  userRole: UserRole;
}

export interface UseCompanyDataReturn {
  userCompanies: UserCompany[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  isLoadingCompanies: boolean;
  errorCompanies: Error | null;
  refetchCompanies: () => void;
}

export const useCompanyData = (): UseCompanyDataReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  const fetchUserCompanies = async (userId: string): Promise<UserCompany[]> => {
    const { data: linksData, error: linksError } = await supabase
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', userId);

    if (linksError) {
      throw new Error(`Failed to load company associations: ${linksError.message}`);
    }
    
    if (!linksData || linksData.length === 0) {
      return [];
    }

    const companyIds = linksData.map(link => link.company_id);
    const userRoleMap = new Map(linksData.map(link => [link.company_id, link.role as UserRole]));

    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .in('id', companyIds);

    if (companiesError) {
      throw new Error(`Failed to load company details: ${companiesError.message}`);
    }

    const combinedUserCompanies = (companiesData || []).map(company => ({
      ...company, // Spread existing columns (id, name, created_at, updated_at, contact_name, contact_email, contact_phone)
      userRole: userRoleMap.get(company.id) || 'member',
    })) as UserCompany[]; // Cast to UserCompany

    return combinedUserCompanies;
  };

  const {
    data: userCompanies,
    isLoading: isLoadingCompanies,
    error: errorCompanies,
    refetch: refetchCompanies,
  } = useQuery<UserCompany[], Error>({
    queryKey: ['userCompanies', user?.id],
    queryFn: () => {
      if (!user) {
        return Promise.resolve([]);
      }

      return fetchUserCompanies(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Effect to set the default current company
  useEffect(() => {
    if (!currentCompany && Array.isArray(userCompanies) && userCompanies.length > 0) {
      // Select the first company as default
      // No need to map fields, userCompanies[0] is already type Company
      setCurrentCompany(userCompanies[0]);
    } else if (Array.isArray(userCompanies) && userCompanies.length === 0) {
        setCurrentCompany(null);
    }
  }, [userCompanies, currentCompany]);

  // Effect to clear current company if user logs out
  useEffect(() => {
      if (!user) {
          setCurrentCompany(null);
      }
  }, [user]);

  return {
    userCompanies: userCompanies ?? [],
    currentCompany,
    setCurrentCompany,
    isLoadingCompanies,
    errorCompanies,
    refetchCompanies,
  };
};