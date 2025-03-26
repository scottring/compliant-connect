import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Company, UserCompany, ExtendedUser } from '@/types/auth';
import { Database } from "@/integrations/supabase/types";

// Add structured error types
interface AuthError {
  code: 'AUTH_ERROR' | 'PROFILE_ERROR' | 'COMPANY_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  originalError?: any;
  recoverable: boolean;
}

interface LoadingState {
  auth: boolean;
  profile: boolean;
  company: boolean;
  global: boolean;
}

type CompanyRole = 'supplier' | 'customer' | 'both';
type UserRole = 'owner' | 'admin' | 'member';

const COMPANY_STORAGE_KEY = 'lastActiveCompany';
const LOADING_TIMEOUT = 10000; // 10 seconds

interface CompanyContextState {
  companies: UserCompany[];
  currentCompany: Company | null;
  role: UserRole;
  permissions: string[];
  lastUpdated: number;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: LoadingState;
  userCompanies: UserCompany[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  userRole: UserRole | null;
  refreshUserData: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  error: AuthError | null;
  clearError: () => void;
  switchCompanyContext: (companyId: string) => Promise<void>;
  getAvailableRoutes: () => string[];
  companyContext: CompanyContextState;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define permission constants
const PERMISSIONS = {
  SUPPLIER: {
    OWNER: [
      'supplier.manage',
      'supplier.view',
      'supplier.edit',
      'pir.respond',
      'pir.view',
      'company.manage',
      'users.manage'
    ],
    ADMIN: [
      'supplier.view',
      'supplier.edit',
      'pir.respond',
      'pir.view',
      'users.view'
    ],
    MEMBER: [
      'supplier.view',
      'pir.respond',
      'pir.view'
    ]
  },
  CUSTOMER: {
    OWNER: [
      'customer.manage',
      'customer.view',
      'customer.edit',
      'pir.create',
      'pir.manage',
      'pir.view',
      'company.manage',
      'users.manage',
      'questions.manage'
    ],
    ADMIN: [
      'customer.view',
      'customer.edit',
      'pir.create',
      'pir.manage',
      'pir.view',
      'questions.edit',
      'users.view'
    ],
    MEMBER: [
      'customer.view',
      'pir.view',
      'questions.view'
    ]
  }
};

// Define route permissions mapping
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['pir.view'],
  '/questions': ['questions.view'],
  '/questions/manage': ['questions.manage'],
  '/pir/create': ['pir.create'],
  '/pir/manage': ['pir.manage'],
  '/pir/respond': ['pir.respond'],
  '/company/settings': ['company.manage'],
  '/users': ['users.view'],
  '/users/manage': ['users.manage']
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    auth: false,
    profile: false,
    company: false,
    global: false
  });
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loadingStartTime, setLoadingStartTime] = useState(Date.now());
  const [error, setError] = useState<AuthError | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContextState>({
    companies: [],
    currentCompany: null,
    role: 'member',
    permissions: [],
    lastUpdated: Date.now()
  });

  const clearError = () => setError(null);

  const handleAuthError = (error: any, context: string): AuthError => {
    console.error(`Error in ${context}:`, error);
    
    let authError: AuthError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      originalError: error,
      recoverable: false
    };

    if (error.message?.includes('auth')) {
      authError = {
        code: 'AUTH_ERROR',
        message: error.message,
        originalError: error,
        recoverable: true
      };
    } else if (error.message?.includes('profile')) {
      authError = {
        code: 'PROFILE_ERROR',
        message: error.message,
        originalError: error,
        recoverable: true
      };
    } else if (error.message?.includes('company')) {
      authError = {
        code: 'COMPANY_ERROR',
        message: error.message,
        originalError: error,
        recoverable: true
      };
    } else if (error.message?.includes('network')) {
      authError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection error',
        originalError: error,
        recoverable: true
      };
    }

    setError(authError);
    return authError;
  };

  // Update loading state helper
  const updateLoading = (key: keyof LoadingState, value: boolean) => {
    setLoading(prev => {
      const newState = { ...prev, [key]: value };
      // Update global loading if any state is loading
      newState.global = Object.values(newState).some(v => v && v !== newState.global);
      return newState;
    });
  };

  // Format company data to match UserCompany type
  const formatCompanyData = (companyData: any, userRole: UserRole): UserCompany => ({
    id: companyData.id,
    name: companyData.name,
    role: companyData.role as CompanyRole,
    contactName: companyData.contact_name || '',
    contactEmail: companyData.contact_email || '',
    contactPhone: companyData.contact_phone || '',
    progress: companyData.progress || 0,
    address: companyData.address || '',
    city: companyData.city || '',
    state: companyData.state || '',
    country: companyData.country || '',
    zipCode: companyData.zip_code || '',
    createdAt: companyData.created_at || new Date().toISOString(),
    updatedAt: companyData.updated_at || new Date().toISOString(),
    userRole: userRole
  });

  // Update companies data transformation
  const transformCompaniesData = (companyUsers: any[]): UserCompany[] => {
    return companyUsers.map(cu => formatCompanyData(cu, cu.role as UserRole));
  };

  // Fetch user data with proper typing
  const fetchUserData = async (userId: string): Promise<{
    error?: string;
    profile: any;
    companies: UserCompany[];
    currentCompany: UserCompany | null;
  }> => {
    try {
      console.log("Fetching user data for:", userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: companyUsers, error: companyUsersError } = await supabase
        .from("company_users")
        .select(`
          role,
          id,
          companies (
            id,
            name,
            role,
            contact_name,
            contact_email,
            contact_phone,
            progress,
            created_at,
            updated_at,
            address,
            city,
            state,
            country,
            zip_code
          )
        `)
        .eq("user_id", userId);

      if (companyUsersError) throw companyUsersError;

      console.log("Raw company users data:", companyUsers);

      // Transform company data
      const companies = (companyUsers || []).map((cu: any) => {
        return formatCompanyData(cu.companies, cu.role as UserRole);
      });
      
      console.log("Transformed companies:", companies);
      
      // Find the first company that is a customer or both
      const currentCompany = companies.find(c => c.role === "customer" || c.role === "both") || companies[0] || null;
      console.log("Selected current company:", currentCompany);

      return {
        profile: profileData,
        companies,
        currentCompany
      };

    } catch (error: any) {
      console.error("Error fetching user data:", error);
      return {
        error: error.message,
        profile: null,
        companies: [],
        currentCompany: null
      };
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (!user?.id) return;
    
    setLoading(prev => ({ ...prev, company: true }));
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
      setLoading(prev => ({ ...prev, company: false }));
    }
  };

  // Initial loading of user
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("AuthProvider: Initial user loading started");
        setLoading(prev => ({ ...prev, auth: true }));

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("AuthProvider: Session retrieval error", sessionError);
          setError(handleAuthError(sessionError, 'initial load'));
          setLoading(prev => ({ ...prev, auth: false }));
          return;
        }

        if (!session) {
          console.log("AuthProvider: No session found, user is not authenticated");
          setUser(null);
          setLoading(prev => ({ ...prev, auth: false }));
          return;
        }

        console.log("AuthProvider: Session found, retrieving user data");
        
        // Get user from auth
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !authUser) {
          console.error("AuthProvider: User retrieval error", userError);
          setError(handleAuthError(userError, 'initial load'));
          setUser(null);
          setLoading(prev => ({ ...prev, auth: false }));
          return;
        }

        // Fetch additional user data from the database
        const response = await fetchUserData(authUser.id);
        
        if (response.error) {
          console.error("AuthProvider: User data fetch error", response.error);
          setError(handleAuthError(new Error(response.error), 'initial load'));
          
          // Try again with a fresh session if it looks like an auth issue
          if (response.error.includes("auth") || response.error.includes("permission")) {
            console.log("AuthProvider: Auth issue detected, refreshing session");
            await supabase.auth.refreshSession();
            const retryResponse = await fetchUserData(authUser.id);
            
            if (retryResponse.error) {
              console.error("AuthProvider: Retry user data fetch failed", retryResponse.error);
              setUser(null);
              setLoading(prev => ({ ...prev, auth: false }));
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
            setLoading(prev => ({ ...prev, auth: false }));
            return;
          }
          
          // Non-auth related error
          setUser(null);
          setLoading(prev => ({ ...prev, auth: false }));
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
        setError(handleAuthError(error, 'initial load'));
        setUser(null);
      } finally {
        setLoading(prev => ({ ...prev, auth: false }));
        console.log("AuthProvider: Initial user loading completed");
      }
    };

    loadUser();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      setSession(session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch and set user data
        const userData = await fetchUserData(session.user.id);
        if (!userData.error) {
          setUser({
            ...session.user,
            profile: userData.profile,
            companies: userData.companies,
            currentCompany: userData.currentCompany,
            role: "user"
          });
          setUserCompanies(userData.companies);
          if (userData.currentCompany) {
            setCurrentCompany(userData.currentCompany);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserCompanies([]);
        setCurrentCompany(null);
      }
    });
    
    // Set up a periodic check for loading state getting stuck
    const loadingCheckInterval = setInterval(() => {
      console.log("AuthProvider: Loading state check...");
      
      // Check if loading state has been true for too long (10+ seconds)
      if (loading.global && Date.now() - loadingStartTime > 10000) {
        console.log("AuthProvider: Force resetting loading state");
        setLoading(prev => ({ ...prev, global: false }));
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(loadingCheckInterval);
    };
  }, []);

  // Update role when current company changes
  useEffect(() => {
    if (user?.companies && currentCompany) {
      // Find the company in the user's companies array to get the user's role in that company
      const userCompanyData = userCompanies.find(c => c.id === currentCompany.id);
      
      if (userCompanyData) {
        setUserRole(userCompanyData.userRole);
      } else {
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
  }, [currentCompany, userCompanies]);

  // Update loadingStartTime whenever loading changes to true
  useEffect(() => {
    if (loading.auth || loading.profile || loading.company) {
      setLoadingStartTime(Date.now());
    }
  }, [loading.auth, loading.profile, loading.company]);

  // Force-reset loading state if needed (fallback safety mechanism)
  useEffect(() => {
    // Check every second if loading has been going on too long
    const forceResetInterval = setInterval(() => {
      if (loading.global) {
        console.log("AuthProvider: Loading state check...");
        const now = Date.now();
        // After 5 seconds of loading, force reset
        if (now - loadingStartTime > 5000) {
          console.log("AuthProvider: Force resetting loading state");
          setLoading(prev => ({ ...prev, global: false }));
        }
      }
    }, 1000);

    return () => clearInterval(forceResetInterval);
  }, [loading.global, loadingStartTime]);

  // Create initial company for user
  const createInitialCompany = async (userId: string, email: string) => {
    try {
      console.log("Creating initial company for user:", userId);
      
      // Create the company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: "My Company",
          role: "customer",
          contact_name: "Admin User",
          contact_email: email,
          contact_phone: "",
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (companyError) {
        console.error("Error creating company:", companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      if (!company) {
        throw new Error("Company creation succeeded but no company data returned");
      }

      console.log("Company created successfully:", company);

      // Create the company_user relationship
      const { data: relationship, error: relationError } = await supabase
        .from("company_users")
        .insert({
          company_id: company.id,
          user_id: userId,
          role: "owner",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (relationError) {
        console.error("Error creating company relationship:", relationError);
        // Clean up the company if relationship creation fails
        await supabase.from("companies").delete().eq("id", company.id);
        throw new Error(`Failed to create company relationship: ${relationError.message}`);
      }

      if (!relationship) {
        // Clean up the company if relationship data is missing
        await supabase.from("companies").delete().eq("id", company.id);
        throw new Error("Company relationship creation succeeded but no data returned");
      }

      console.log("Company relationship created successfully:", relationship);
      return company;
    } catch (error) {
      console.error("Error in createInitialCompany:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      updateLoading('auth', true);
      clearError();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      setSession(data.session);
      
      if (data.user) {
        updateLoading('profile', true);
        const userData = await fetchUserData(data.user.id);
        
        if (userData.error) {
          throw new Error(`profile:${userData.error}`);
        }
        
        setUser({
          ...data.user,
          profile: userData.profile,
          companies: userData.companies,
          currentCompany: userData.currentCompany,
          role: "user"
        });
        
        setUserCompanies(userData.companies);
        if (userData.currentCompany) {
          setCurrentCompany(userData.currentCompany);
        }
      }
      
      toast.success("Signed in successfully");
    } catch (error: any) {
      const authError = handleAuthError(error, 'signIn');
      toast.error(authError.message);
      throw error;
    } finally {
      updateLoading('auth', false);
      updateLoading('profile', false);
    }
  };

  // Modify signUp to create initial company
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setLoading(prev => ({ ...prev, auth: true }));
      console.log("Starting signup process for:", email);

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;
      console.log("Auth signup successful:", data.user?.id);

      if (data.user) {
        try {
          console.log("Creating profile for user:", data.user.id);
          // Create profile first
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              first_name: firstName,
              last_name: lastName,
              email: email,
            });

          if (profileError) {
            console.error("Error creating profile:", profileError);
            throw profileError;
          }
          console.log("Profile created successfully");

          // Sign in to get session
          console.log("Signing in after signup");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (signInError) throw signInError;
          console.log("Sign in successful");

          // Create initial company
          console.log("Creating initial company");
          const company = await createInitialCompany(data.user.id, email);
          console.log("Initial company created:", company);

          // Transform the company data to match UserCompany type
          const userCompany = formatCompanyData(company, 'owner');
          
          // Set the session and user data
          setSession(signInData.session);
          setUser({
            ...data.user,
            profile: {
              firstName,
              lastName
            },
            companies: [userCompany],
            currentCompany: userCompany,
            role: "user"
          });

          // Update userCompanies state
          setUserCompanies([userCompany]);
          setCurrentCompany(userCompany);

          toast.success("Account created successfully!");
          return;

        } catch (setupError: any) {
          console.error("Error in post-signup setup:", setupError);
          toast.error("Account created but there was an error setting up your profile. Please try signing in.");
          throw setupError;
        }
      }

      toast.success("Account created! Please check your email to confirm your account.");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, auth: false }));
    }
  };

  const signOut = async () => {
    try {
      setLoading(prev => ({ ...prev, global: true }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error(error.message || "Error signing out");
    } finally {
      setLoading(prev => ({ ...prev, global: false }));
    }
  };

  // Update the switchCompanyContext function
  const switchCompanyContext = async (companyId: string) => {
    try {
      updateLoading('company', true);
      
      // Validate company ID
      if (!companyId) {
        throw new Error('Invalid company ID');
      }

      // Find target company in user's companies
      const targetCompany = userCompanies.find(c => c.id === companyId);
      if (!targetCompany) {
        throw new Error('Company not found in user\'s companies');
      }

      // Fetch fresh company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      // Validate company data
      if (!companyData) {
        throw new Error('Company data not found');
      }

      // Format company data
      const formattedCompany = formatCompanyData(companyData, targetCompany.userRole);

      // Calculate permissions
      const permissions = calculatePermissions(targetCompany.userRole, formattedCompany.role);

      // Update company context
      const newContext: CompanyContextState = {
        companies: userCompanies,
        currentCompany: formattedCompany,
        role: targetCompany.userRole,
        permissions,
        lastUpdated: Date.now()
      };

      setCompanyContext(newContext);
      setCurrentCompany(formattedCompany);

      // Persist company selection
      localStorage.setItem(COMPANY_STORAGE_KEY, companyId);

      // Notify success
      toast.success('Company context updated successfully');

    } catch (error: any) {
      const authError = handleAuthError(error, 'switchCompanyContext');
      toast.error(authError.message);
    } finally {
      updateLoading('company', false);
    }
  };

  // Initialize company context from storage
  useEffect(() => {
    const initializeCompanyContext = async () => {
      try {
        // Only initialize if we have user companies
        if (userCompanies.length === 0) return;

        // Get last active company from storage
        const lastActiveCompanyId = localStorage.getItem(COMPANY_STORAGE_KEY);
        
        // If we have a stored company ID and it's in user's companies, use it
        if (lastActiveCompanyId && userCompanies.some(c => c.id === lastActiveCompanyId)) {
          await switchCompanyContext(lastActiveCompanyId);
        } else {
          // Otherwise use first company
          await switchCompanyContext(userCompanies[0].id);
        }
      } catch (error: any) {
        handleAuthError(error, 'initializeCompanyContext');
      }
    };

    initializeCompanyContext();
  }, [userCompanies]);

  // Handle loading timeouts
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentTime = Date.now();
      const loadingDuration = currentTime - loadingStartTime;

      if (loadingDuration >= LOADING_TIMEOUT) {
        // Reset loading states if they've been active too long
        setLoading({
          auth: false,
          profile: false,
          company: false,
          global: false
        });
        
        handleAuthError(
          new Error('Loading timeout - operation took too long'),
          'loadingTimeout'
        );
      }
    }, LOADING_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [loading, loadingStartTime]);

  const calculatePermissions = (role: UserRole, companyType: CompanyRole): string[] => {
    let permissions: string[] = [];

    // Handle 'both' company type
    if (companyType === 'both') {
      // For 'both', combine permissions from supplier and customer roles
      permissions = [
        ...PERMISSIONS.SUPPLIER[role.toUpperCase() as keyof typeof PERMISSIONS.SUPPLIER],
        ...PERMISSIONS.CUSTOMER[role.toUpperCase() as keyof typeof PERMISSIONS.CUSTOMER]
      ];
    } else {
      // Get permissions for specific company type
      const typePermissions = companyType === 'supplier' ? PERMISSIONS.SUPPLIER : PERMISSIONS.CUSTOMER;
      permissions = typePermissions[role.toUpperCase() as keyof typeof PERMISSIONS.SUPPLIER];
    }

    // Add common permissions that everyone should have
    permissions.push('auth.logout', 'profile.view', 'profile.edit');

    // Remove duplicates
    return [...new Set(permissions)];
  };

  const getAvailableRoutes = (): string[] => {
    if (!companyContext.currentCompany || !companyContext.permissions) {
      return ['/auth/login', '/auth/signup'];
    }

    const availableRoutes = Object.entries(ROUTE_PERMISSIONS)
      .filter(([_, requiredPermissions]) => 
        requiredPermissions.some(permission => companyContext.permissions.includes(permission))
      )
      .map(([route]) => route);

    // Add routes that don't require specific permissions
    availableRoutes.push(
      '/profile',
      '/auth/logout',
      '/'
    );

    return availableRoutes;
  };

  const hasPermission = (permission: string): boolean => {
    if (!companyContext.permissions) {
      return false;
    }

    // Handle permission wildcards (e.g., 'pir.*' matches all PIR permissions)
    if (permission.endsWith('.*')) {
      const prefix = permission.slice(0, -2);
      return companyContext.permissions.some(p => p.startsWith(prefix));
    }

    return companyContext.permissions.includes(permission);
  };

  return (
    <div id="auth-provider" data-loading={loading.global}>
      <AuthContext.Provider
        value={{
          user,
          session,
          signIn,
          signUp,
          signOut,
          loading,
          error,
          clearError,
          userCompanies,
          currentCompany,
          setCurrentCompany,
          userRole,
          refreshUserData,
          hasPermission,
          switchCompanyContext,
          getAvailableRoutes,
          companyContext
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
