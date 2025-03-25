import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

// Extended user type to include profile and company data
export type ExtendedUser = User & {
  profile?: Tables<"profiles"> | null;
  companies?: Tables<"companies">[];
  roles?: Tables<"company_users">[];
};

export type UserRole = "admin" | "user" | "owner";

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
  const [userCompanies, setUserCompanies] = useState<Tables<"companies">[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Tables<"companies"> | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Fetch user profile and company data
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Handle missing profile - attempt to create it from user metadata
      if (profileError && profileError.code === 'PGRST116') {
        console.log("Profile not found, checking user metadata");
        const { data: { user: authUser } } = await supabase.auth.getUser(userId);
        
        if (authUser) {
          // Create profile from auth user metadata
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              email: authUser.email,
              first_name: authUser.user_metadata.first_name,
              last_name: authUser.user_metadata.last_name,
            })
            .select()
            .single();
          
          if (createError) {
            console.error("Error creating profile:", createError);
          } else {
            console.log("Profile created successfully");
            // Use the newly created profile
            return await fetchUserData(userId);
          }
        }
      } else if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      // Fetch company associations
      const { data: companyUsers, error: companyError } = await supabase
        .from("company_users")
        .select(`
          id, role,
          company:companies(*)
        `)
        .eq("user_id", userId);

      if (companyError) {
        console.error("Error fetching company associations:", companyError);
        // Continue execution but with empty company data
      }

      // Extract companies from the response
      const companies = companyUsers?.map((cu) => cu.company as Tables<"companies">) || [];
      
      // Set user companies
      setUserCompanies(companies);
      
      // Set default company if not set
      if (companies.length > 0 && !currentCompany) {
        setCurrentCompany(companies[0]);
      }

      // Get user role for current company
      if (currentCompany && companyUsers) {
        const companyUser = companyUsers.find(cu => 
          (cu.company as Tables<"companies">).id === currentCompany.id
        );
        if (companyUser) {
          setUserRole(companyUser.role as UserRole);
        }
      } else if (companyUsers && companyUsers.length > 0) {
        setUserRole(companyUsers[0].role as UserRole);
      }

      // Update user with extended data
      return {
        ...user!,
        profile: profile || null,
        companies: companies || [],
        roles: companyUsers || [],
      };
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return user;
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (user?.id) {
      const extendedUser = await fetchUserData(user.id);
      setUser(extendedUser as ExtendedUser);
    }
  };

  useEffect(() => {
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, newSession?.user?.email);
        setSession(newSession);
        
        if (newSession?.user) {
          console.log("User authenticated, fetching profile and company data...");
          const extendedUser = await fetchUserData(newSession.user.id);
          console.log("User data fetched:", { 
            hasProfile: !!extendedUser.profile,
            companyCount: extendedUser.companies?.length || 0
          });
          setUser(extendedUser as ExtendedUser);
        } else {
          console.log("User logged out or session ended");
          setUser(null);
          setUserCompanies([]);
          setCurrentCompany(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession?.user?.email || "No session");
      setSession(currentSession);
      
      if (currentSession?.user) {
        console.log("Found existing session, fetching user data...");
        const extendedUser = await fetchUserData(currentSession.user.id);
        console.log("Existing user data loaded:", { 
          hasProfile: !!extendedUser.profile,
          companyCount: extendedUser.companies?.length || 0
        });
        setUser(extendedUser as ExtendedUser);
      } else {
        console.log("No existing session found");
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update role when current company changes
  useEffect(() => {
    if (user?.roles && currentCompany) {
      const companyUser = user.roles.find(cu => 
        (cu as any).company?.id === currentCompany.id
      );
      
      if (companyUser) {
        setUserRole(companyUser.role as UserRole);
      } else {
        setUserRole(null);
      }
    }
  }, [currentCompany, user?.roles]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log("Signing in user:", email);
      
      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      console.log("Authentication successful, waiting for session establishment");
      
      // Ensure user data is loaded after sign in
      if (data.user) {
        const extendedUser = await fetchUserData(data.user.id);
        setUser(extendedUser as ExtendedUser);
        console.log("User signed in and profile loaded:", {
          id: data.user.id,
          email: data.user.email,
          hasProfile: !!extendedUser.profile,
          companyCount: extendedUser.companies?.length || 0
        });
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
    if (!user || !userRole) return false;

    // For now, using a simple role-based approach
    switch (permission) {
      case 'create:company':
        return true; // Any logged-in user can create a company
      case 'admin:access':
        return userRole === 'admin' || userRole === 'owner';
      case 'owner:access':
        return userRole === 'owner';
      default:
        return true; // Default to allowing basic access
    }
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
        userRole,
        refreshUserData,
        hasPermission
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
