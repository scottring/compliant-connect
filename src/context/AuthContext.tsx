import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase"; // Ensure this is the correct client
import { toast } from "sonner";
import { Company, UserCompany, ExtendedUser, UserRole } from '@/types/auth'; 

// Simplified loading state
export interface LoadingState {
  auth: boolean;
  global: boolean;
}

export interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: LoadingState;
  userCompanies: UserCompany[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    auth: false,  // Start with loading state as false
    global: false
  });
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  // --- Refactored Company Association Logic ---
  const _ensureUserCompanyAssociation = async (userId: string, email: string): Promise<boolean> => {
    console.log("AuthContext: Entering _ensureUserCompanyAssociation for user:", userId);
    let associationCreated = false;
    try {
      // Profile Check
      console.log("AuthContext: [_ensure] Checking for profile...");
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        console.log('Profile not found, creating one...');
        const { data: userData } = await supabase.auth.getUser();
        const firstName = userData?.user?.user_metadata?.first_name || email.split('@')[0];
        const lastName = userData?.user?.user_metadata?.last_name || '';
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId, first_name: firstName, last_name: lastName });
        // Ignore duplicate key (23505) AND foreign key (23503) errors, throw others
        if (insertError && insertError.code !== '23505' && insertError.code !== '23503') { 
            console.error("AuthContext: [_ensure] Error inserting profile:", insertError);
            throw new Error('Failed to create user profile');
        } else if (!insertError) {
             console.log('AuthContext: [_ensure] Profile created successfully');
        } else {
             console.log(`AuthContext: [_ensure] Profile likely already exists or FK violation (ignored insert error ${insertError.code}).`);
        }
      } else if (profileError) {
        console.error("AuthContext: [_ensure] Error checking for profile:", profileError);
        // Continue even if profile check fails, maybe it exists but query failed
      } else {
        console.log('AuthContext: [_ensure] Profile already exists');
      }

      // Existing Association Check
      console.log("AuthContext: [_ensure] Checking for existing company associations...");
      const { data: existingCompanies, error: checkError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', userId)
        .limit(1);

      if (checkError) {
        console.error("AuthContext: Error checking for existing companies:", checkError);
        return false; // Cannot proceed
      }

      if (existingCompanies && existingCompanies.length > 0) {
        console.log("AuthContext: [_ensure] User already has company associations. Skipping creation.");
        return false; // No new association needed
      }

      // Company Creation
      console.log("AuthContext: [_ensure] No existing company found, attempting to create test company...");
      const companyName = email.split('@')[0] + "'s Test Company";
      // Remove created_by, contact_email, and status from insert as they don't exist in schema
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: companyName }) // Removed status, contact_email, created_by
        .select()
        .single();
      if (companyError) {
        console.error("AuthContext: [_ensure] Error creating company:", companyError);
        return false; // Cannot proceed
      }
      console.log("AuthContext: [_ensure] Created company:", company);

      // Add a small delay to allow auth.users propagation
      await new Promise(resolve => setTimeout(resolve, 500)); 
      console.log("AuthContext: [_ensure] Waited 500ms, now attempting to associate user...");

      // Association Creation
      console.log("AuthContext: [_ensure] Attempting to associate user with company...");
      const { data: companyUser, error: userError } = await supabase
        .from('company_users')
        .insert({ user_id: userId, company_id: company.id, role: 'admin' }) 
        .select()
        .single();
      if (userError) {
        console.error("AuthContext: [_ensure] Error associating user with company:", userError);
        // Consider cleanup if company was created but association failed
        return false; // Association failed
      }
      console.log("AuthContext: [_ensure] User granted admin access:", companyUser);
      associationCreated = true; // Mark that we created one

    } catch (error) {
      console.error("AuthContext: [_ensure] CATCH BLOCK Error in _ensureUserCompanyAssociation:", error); // Log errors caught here
      associationCreated = false; // Ensure flag is false on error
    }
    console.log("AuthContext: Exiting _ensureUserCompanyAssociation for user:", userId, "Association created:", associationCreated);
    return associationCreated; // Return whether a new association was made
  };
  // --- End Refactored Logic ---

  // Set up auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser({ ...session.user, profile: null, companies: [], currentCompany: null, role: "user" });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        if (session?.user) {
          setUser({ ...session.user, profile: null, companies: [], currentCompany: null, role: "user" });
        } else {
          setUser(null);
          setUserCompanies([]);
          setCurrentCompany(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Add useEffect to run refreshUserData when user state changes
  useEffect(() => {
    if (user) {
      console.log("AuthContext: User state updated, calling refreshUserData.");
      refreshUserData();
    }
  }, [user]);

  // Refresh user data using two-step query
  const refreshUserData = async (isRetry = false) => {
    console.log(`AuthContext: Entering refreshUserData (Retry: ${isRetry})`);
    console.log("AuthContext: User state before check:", user);
    if (!user || !user.email) { // Ensure user and email exist
      console.log("AuthContext: Exiting refreshUserData because user or user.email is null.");
      return;
    }
    console.log("AuthContext: User exists, proceeding...");

    let userCompanyLinks: { company_id: string; role: string }[] | null = null; // Define variable outside try

    try {
      console.log("AuthContext: Setting loading state...");
      setLoading({ auth: true, global: true });

      // Step 1: Fetch company_id and user's role from company_users
      const { data, error: linksError } = await supabase
        .from('company_users')
        .select('company_id, role')
        .eq('user_id', user.id);
      
      userCompanyLinks = data; // Assign fetched data

      if (linksError) {
        console.error('Error loading user company links:', linksError);
        toast.error('Failed to load your company associations');
        setLoading({ auth: false, global: false }); // Ensure loading is unset on error
        return;
      }
      console.log("AuthContext: Fetched userCompanyLinks:", userCompanyLinks);

      if (!userCompanyLinks || userCompanyLinks.length === 0) {
        console.log("AuthContext: User has no company associations. Attempting to ensure association...");
        setUserCompanies([]); // Set empty first

        // Attempt to create association if this isn't already a retry
        if (!isRetry) {
            const created = await _ensureUserCompanyAssociation(user.id, user.email);
            if (created) {
                console.log("AuthContext: Association created, retrying refreshUserData...");
                // Don't await, let the retry handle loading state
                refreshUserData(true); 
                return; // Exit this execution
            } else {
                 console.log("AuthContext: Ensure association did not create a new one or failed.");
            }
        } else {
             console.log("AuthContext: Already retried, still no companies found.");
        }

        // If still no companies after check/creation attempt, log and exit
        // Check the state variable userCompanies which might have been updated by the retry
        const finalUserCompanies = userCompanies; // Capture current state
        if (finalUserCompanies.length === 0) { 
             if (currentCompany) console.log("AuthContext: Default company not set because user has no companies (after check).");
             setLoading({ auth: false, global: false }); // Ensure loading is unset
             return; 
        }
        // If retry populated userCompanies, continue below
      }

      // Ensure userCompanyLinks is not null before proceeding (TypeScript check)
      if (!userCompanyLinks) {
          console.error("AuthContext: userCompanyLinks is unexpectedly null after checks.");
          setLoading({ auth: false, global: false });
          return;
      }

      // Step 2: Extract company IDs and create a map of companyId -> userRole
      const companyIds = userCompanyLinks.map(link => link.company_id);
      const userRoleMap = new Map(userCompanyLinks.map(link => [link.company_id, link.role as UserRole]));

      // Step 3: Fetch full company details for those IDs
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds);

      if (companiesError) {
        console.error('Error loading company details:', companiesError);
        toast.error('Failed to load company details');
        setLoading({ auth: false, global: false }); // Ensure loading is unset on error
        return;
      }
      console.log("AuthContext: Fetched companiesData:", companiesData);

      // Step 4: Combine company details with the user's role for that company
      const combinedUserCompanies = companiesData.map(company => ({
        ...company,
        contactName: company.contact_name || "",
        contactEmail: company.contact_email || "",
        contactPhone: company.contact_phone || "",
        progress: company.progress || 0,
        userRole: userRoleMap.get(company.id) || 'member',
      })) as UserCompany[];

      setUserCompanies(combinedUserCompanies);
      console.log("AuthContext: Set userCompanies:", combinedUserCompanies);

      // Set default company (Using combined data)
      // Check combinedUserCompanies directly here
      if (!currentCompany && combinedUserCompanies.length > 0) { 
        const firstCompany: Company = {
          id: combinedUserCompanies[0].id,
          name: combinedUserCompanies[0].name,
          contactName: combinedUserCompanies[0].contactName,
          contactEmail: combinedUserCompanies[0].contactEmail,
          contactPhone: combinedUserCompanies[0].contactPhone,
          progress: combinedUserCompanies[0].progress,
          createdAt: combinedUserCompanies[0].createdAt,
          updatedAt: combinedUserCompanies[0].updatedAt
        };
        console.log("AuthContext: Setting default company:", firstCompany);
        setCurrentCompany(firstCompany);
      } else {
        if (currentCompany) console.log("AuthContext: Default company not set because currentCompany already exists:", currentCompany);
        // Use combinedUserCompanies for the check here too
        if (combinedUserCompanies.length === 0) console.log("AuthContext: Default company not set because user has no companies."); 
      }

    } catch (error) {
      console.error('Error in refreshUserData:', error);
      toast.error('Failed to refresh user data');
    } finally {
      // Only set loading false if not a retry that triggered another refresh
      // Check userCompanyLinks here, as userCompanies might be empty before the retry finishes
      if (!isRetry || (userCompanyLinks && userCompanyLinks.length > 0)) { // Corrected variable name check
          console.log("AuthContext: currentCompany state before finally:", currentCompany);
          setLoading({ auth: false, global: false });
          console.log("AuthContext: Exiting refreshUserData (finally block)");
      }
    }
  };

  // Sign in function - simplified
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      setLoading({ auth: true, global: true });
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        // Ensure association exists or is created *before* user state update triggers refresh
        await _ensureUserCompanyAssociation(data.user.id, email); 
      }
      return { error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
      return { error: error as Error };
    } finally {
      setLoading({ auth: false, global: false }); // Loading state handled here
    }
  };

  // Sign up function - simplified
  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<{ error: Error | null }> => {
    try {
      setLoading({ auth: true, global: true });
      const { error, data } = await supabase.auth.signUp({
        email, password, options: { data: { first_name: firstName, last_name: lastName }, emailRedirectTo: `${window.location.origin}/email-confirmation` }
      });
      if (error) throw error;
      if (data.user) {
         // Ensure association exists or is created *before* user state update triggers refresh
        await _ensureUserCompanyAssociation(data.user.id, email);
      }
      return { error: null };
    } catch (error: any) {
      console.error("Sign up error:", error);
      return { error: error as Error };
    } finally {
      setLoading({ auth: false, global: false }); // Loading state handled here
    }
  };

  // Sign out function - simplified
  const signOut = async () => {
    try {
      setLoading({ auth: true, global: true });
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error("Error signing out");
    } finally {
      setLoading({ auth: false, global: false });
    }
  };

  // Original function signature kept, calls refactored logic
  const ensureUserHasAdminCompany = async (userId: string, email: string) => {
     await _ensureUserCompanyAssociation(userId, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signUp,
        signOut,
        loading,
        userCompanies,
        currentCompany,
        setCurrentCompany,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
