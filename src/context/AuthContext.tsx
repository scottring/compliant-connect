import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Company, CompanyUser } from '@/types';
import { UserCompany, ExtendedUser, UserRole } from '@/types/auth';

// Extended user type to include profile and company data
export type ExtendedUser = User & {
  profile: any;
  companies: Array<{
    id: string;
    name: string;
    role: string;
    userRole: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    progress: number;
  }>;
  currentCompany: {
    id: string;
    name: string;
    role: string;
    userRole: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    progress: number;
  } | null;
  role: string;
};

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  userCompanies: Tables<"companies">[];
  currentCompany: Tables<"companies"> | null;
  setCurrentCompany: (company: Tables<"companies"> | null) => void;
  userRole: UserRole | null;
  refreshUserData: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loadingStartTime, setLoadingStartTime] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  // Format company data to match UserCompany type
  const formatCompanyData = (companyData: any, userRole: UserRole): UserCompany => ({
    id: companyData.id,
    name: companyData.name,
    role: companyData.role as "supplier" | "customer" | "both",
    contact_name: companyData.contact_name || '',
    contact_email: companyData.contact_email || '',
    contact_phone: companyData.contact_phone || '',
    progress: companyData.progress || 0,
    address: companyData.address || '',
    city: companyData.city || '',
    state: companyData.state || '',
    country: companyData.country || '',
    zip_code: companyData.zip_code || '',
    created_at: companyData.created_at || new Date().toISOString(),
    updated_at: companyData.updated_at || new Date().toISOString(),
    userRole: userRole
  });

  // Update companies data transformation
  const transformCompaniesData = (companyUsers: any[]): UserCompany[] => {
    return companyUsers.map(cu => formatCompanyData(cu.company, cu.role as UserRole));
  };

  // Fetch user data with proper typing
  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: companyUsers, error: companyUsersError } = await supabase
        .from("company_users")
        .select(`
          id,
          role,
          company:companies (
            id,
            name,
            role,
            contact_name,
            contact_email,
            contact_phone,
            progress,
            address,
            city,
            state,
            country,
            zip_code,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", userId);

      if (companyUsersError) throw companyUsersError;

      const companies = transformCompaniesData(companyUsers);
      const currentCompany = companies.length > 0 ? companies[0] : null;

      return {
        error: null,
        profile: profileData,
        companies,
        currentCompany
      };
    } catch (error: any) {
      console.error("Unexpected error in fetchUserData:", error);
      return { 
        error: `Unexpected error: ${error.message}`,
        profile: null,
        companies: [],
        currentCompany: null
      };
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const userData = await fetchUserData(user.id);
      if (userData) {
        // Update user object with new data
        setUser({
          ...user,
          profile: userData.profile,
          companies: userData.companies,
          currentCompany: userData.currentCompany
        });
        
        // Update company lists
        if (userData.companies && userData.companies.length > 0) {
          setUserCompanies(userData.companies);
          
          // Set current company if not already set
          if (!currentCompany && userData.currentCompany) {
            setCurrentCompany(userData.currentCompany);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial loading of user
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("AuthProvider: Initial user loading started");
        setLoading(true);

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("AuthProvider: Session retrieval error", sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (!session) {
          console.log("AuthProvider: No session found, user is not authenticated");
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("AuthProvider: Session found, retrieving user data");
        
        // Get user from auth
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !authUser) {
          console.error("AuthProvider: User retrieval error", userError);
          setError(userError?.message || "Failed to retrieve user data");
          setLoading(false);
          return;
        }

        // Fetch additional user data from the database
        const response = await fetchUserData(authUser.id);
        
        if (response.error) {
          console.error("AuthProvider: User data fetch error", response.error);
          setError(response.error);
          
          // Try again with a fresh session if it looks like an auth issue
          if (response.error.includes("auth") || response.error.includes("permission")) {
            console.log("AuthProvider: Auth issue detected, refreshing session");
            await supabase.auth.refreshSession();
            const retryResponse = await fetchUserData(authUser.id);
            
            if (retryResponse.error) {
              console.error("AuthProvider: Retry user data fetch failed", retryResponse.error);
              setUser(null);
              setLoading(false);
              return;
            }
            
            // Success after retry
            setUser({
              ...authUser,
              profile: retryResponse.profile,
              companies: retryResponse.companies,
              currentCompany: retryResponse.currentCompany,
              role: "user", // Default role
            });
            setLoading(false);
            return;
          }
          
          // Non-auth related error
          setUser(null);
          setLoading(false);
          return;
        }

        // Set user with database data
        setUser({
          ...authUser,
          profile: response.profile,
          companies: response.companies,
          currentCompany: response.currentCompany,
          role: "user", // Default role
        });
      } catch (error: any) {
        console.error("AuthProvider: Unexpected error during initial load", error);
        setError(error.message);
        setUser(null);
      } finally {
        setLoading(false);
        console.log("AuthProvider: Initial user loading completed");
      }
    };

    loadUser();
    
    // Set up a periodic check for loading state getting stuck
    const loadingCheckInterval = setInterval(() => {
      console.log("AuthProvider: Loading state check...");
      
      // Check if loading state has been true for too long (10+ seconds)
      if (loading && Date.now() - loadingStartTime > 10000) {
        console.log("AuthProvider: Force resetting loading state");
        setLoading(false);
      }
    }, 5000);

    return () => {
      clearInterval(loadingCheckInterval);
    };
  }, []);

  // Update role when current company changes
  useEffect(() => {
    if (user?.companies && currentCompany) {
      // Find the company in the user's companies array to get the user's role in that company
      const userCompanyData = user.companies.find(c => c.id === currentCompany.id);
      
      if (userCompanyData) {
        // Use the userRole from the company data
        setUserRole(userCompanyData.userRole as UserRole);
      } else {
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
  }, [currentCompany, user?.companies]);

  // Update loadingStartTime whenever loading changes to true
  useEffect(() => {
    if (loading) {
      setLoadingStartTime(Date.now());
    }
  }, [loading]);

  // Force-reset loading state if needed (fallback safety mechanism)
  useEffect(() => {
    // Check every second if loading has been going on too long
    const forceResetInterval = setInterval(() => {
      if (loading) {
        console.log("AuthProvider: Loading state check...");
        const now = Date.now();
        // After 5 seconds of loading, force reset
        if (now - loadingStartTime > 5000) {
          console.log("AuthProvider: Force resetting loading state");
          setLoading(false);
        }
      }
    }, 1000);

    return () => clearInterval(forceResetInterval);
  }, [loading, loadingStartTime]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Set session
      setSession(data.session);
      
      // Debug the user info
      console.log("Auth sign-in successful:", {
        user: data.user?.email,
        id: data.user?.id,
        hasMetadata: !!data.user?.user_metadata,
        metadata: data.user?.user_metadata
      });
      
      // Check if email is confirmed (if needed by app flow)
      // ...
      
      // Set base user right away so there's something
      if (data.user) {
        // If profile loading fails, still set the user to the basic auth user
        setUser(data.user as ExtendedUser);
      }
      
      toast.success("Signed in successfully");
    } catch (error: any) {
      console.error("Sign in error:", error);
      
      // Special handling for unconfirmed email
      if (error.message === "Email not confirmed") {
        toast.error("Please confirm your email before signing in. Check your inbox for the confirmation link.");
      } else {
        toast.error(error.message || "Error signing in");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setLoading(true);
      // Create the user in Supabase Auth
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: window.location.origin + "/email-confirmation",
        },
      });
      
      if (error) throw error;
      
      // If successful but no user was returned (email confirmation required)
      if (!data.user) {
        toast.success("Sign up successful! Please check your email for confirmation.");
        return;
      }
      
      toast.success("Account created successfully!");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Error signing up");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(error.message || "Error signing out");
    } finally {
      setLoading(false);
    }
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user || !currentCompany) return false;

    // Find the user's role in the current company
    const companyData = userCompanies.find(c => c.id === currentCompany.id);
    if (!companyData) return false;

    // For now, using a simple role-based approach
    switch (permission) {
      case 'create:company':
        return true; // Any logged-in user can create a company
      case 'admin:access':
        return companyData.userRole === 'admin' || companyData.userRole === 'owner';
      case 'owner:access':
        return companyData.userRole === 'owner';
      default:
        return true; // Default to allowing basic access
    }
  };

  // Load user's companies
  const loadUserCompanies = async (userId: string) => {
    try {
      const { data: companyUsers, error: companyUsersError } = await supabase
        .from('company_users')
        .select(`
          companies (
            id,
            name,
            role,
            contact_name,
            contact_email,
            contact_phone,
            progress,
            address,
            city,
            state,
            country,
            zip_code,
            created_at,
            updated_at
          ),
          role as userRole
        `)
        .eq('user_id', userId);

      if (companyUsersError) throw companyUsersError;

      // Transform the data to match UserCompany type
      const transformedCompanies: UserCompany[] = companyUsers.map((cu: any) => ({
        ...cu.companies,
        userRole: cu.userRole
      }));

      setUser(prev => prev ? { ...prev, companies: transformedCompanies } : null);
    } catch (error) {
      console.error('Error loading user companies:', error);
      toast.error('Failed to load user companies');
    }
  };

  return (
    <div id="auth-provider" data-loading={loading}>
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
          userRole,
          refreshUserData,
          hasPermission
        }}
      >
        {children}
      </AuthContext.Provider>
    </div>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  // Get a reference to the original loading state
  const { loading: originalLoading, ...rest } = context;
  
  // Check if we should force the loading state to false
  const authProvider = document.getElementById('auth-provider');
  const forceLoaded = authProvider?.dataset.forceLoaded === 'true';
  const loading = forceLoaded ? false : originalLoading;
  
  // Log if we're forcing the loading state
  if (forceLoaded && originalLoading) {
    console.log('useAuth: Force loading state to false');
  }
  
  return { ...rest, loading };
};
