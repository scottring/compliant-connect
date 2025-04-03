import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Removed Company, UserCompany, ExtendedUser, UserRole imports as company logic is removed
// import { Company, UserCompany, ExtendedUser, UserRole } from '@/types/auth';

<<<<<<< Updated upstream
// Simplified loading state - focused only on auth process itself
export interface LoadingState {
  auth: boolean;
}
=======
// Extended user type to include profile and company data
export type ExtendedUser = User & {
  profile?: Tables<"profiles"> | null;
  companies?: Tables<"companies">[];
  // Adjust roles to match the structure returned by fetchUserData's select query
  roles?: ({
    id: string;
    role: string;
    company: Tables<"companies"> | null; // The join might result in null
  })[];
};
>>>>>>> Stashed changes

export interface AuthContextType {
  // Keep Supabase user and session
  user: User | null; // Use Supabase User type directly
  session: Session | null;
  // Keep core auth functions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  // Keep auth loading state
  loading: LoadingState;
  // Removed company-related properties
  // userCompanies: UserCompany[];
  // currentCompany: Company | null;
  // setCurrentCompany: (company: Company | null) => void;
  // refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
<<<<<<< Updated upstream
  const [user, setUser] = useState<User | null>(null); // Use Supabase User type
  const [loading, setLoading] = useState<LoadingState>({
    auth: true, // Start true until initial session check completes
  });
  // Removed company state
  // const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  // const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  // --- Removed Company Association Logic ---
  // const _ensureUserCompanyAssociation = ... removed ...
=======
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [userCompanies, setUserCompanies] = useState<Tables<"companies">[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Tables<"companies"> | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Fetch user profile and company data
  const fetchUserData = async (userId: string) => {
    console.log('fetchUserData')
    try {
      // Fetch profile
      console.log('before fetch profile')
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      console.log('after fetch profile')

      // Handle missing profile - attempt to create it from user metadata
      if (profileError && profileError.code === 'PGRST116') {
        console.log("Profile not found, checking user metadata");
        console.log(`Attempting supabase.auth.getUser() for current session user.`); // Log before
        // Fetch the currently authenticated user based on the session, no userId needed client-side
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log("supabase.auth.getUser() completed."); // Log after

        if (authError) {
          console.error("Error fetching auth user:", authError);
          throw authError; // Propagate the error
        }

        const authUser = authData?.user;
        console.log("Auth user data fetched:", authUser ? authUser.id : 'No auth user found'); // Log the result

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
            // Throw the error if profile creation fails, allowing the outer catch to handle it
            throw createError;
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
      // Re-throw the error so the calling function's catch block can handle it
      // and potentially reset state or show a more specific error.
      throw error;
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (user?.id) {
      const extendedUser = await fetchUserData(user.id);
      setUser(extendedUser as ExtendedUser);
    }
  };
>>>>>>> Stashed changes

  // Set up auth state listener
  useEffect(() => {
<<<<<<< Updated upstream
    console.log('AuthProvider: Initializing');
    setLoading({ auth: true }); // Set loading true during initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session check', { hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null); // Set user or null
      setLoading({ auth: false }); // Finish initial loading
    }).catch((error) => {
        console.error("Error getting initial session:", error);
        setLoading({ auth: false }); // Ensure loading stops on error too
=======
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        try {
          console.log("Auth state changed:", event, newSession?.user?.email);
          setSession(newSession);

          if (newSession?.user) {
            console.log("User authenticated, fetching profile and company data...");
            const extendedUser = await fetchUserData(newSession.user.id);
            console.log("User data fetched:", {
              hasProfile: !!extendedUser?.profile, // Safe access
              companyCount: extendedUser?.companies?.length || 0 // Safe access
            });
            setUser(extendedUser as ExtendedUser);
          } else {
            console.log("User logged out or session ended");
            setUser(null);
            setUserCompanies([]);
            setCurrentCompany(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error handling auth state change:", error);
          // Optionally reset state or show error to user
          setUser(null); // Reset user state on error
        } finally {
          // Ensure loading is set to false after processing, even if errors occurred
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      try {
        console.log("Initial session check:", currentSession?.user?.email || "No session");
        setSession(currentSession);

        if (currentSession?.user) {
          console.log("Found existing session, fetching user data...");
          const extendedUser = await fetchUserData(currentSession.user.id);
          console.log("Existing user data loaded:", {
            hasProfile: !!extendedUser?.profile, // Safe access
            companyCount: extendedUser?.companies?.length || 0 // Safe access
          });
          setUser(extendedUser as ExtendedUser);
        } else {
          console.log("No existing session found");
          setUser(null);
        }
      } catch (error) {
        console.error("Error handling initial session check:", error);
        setUser(null); // Reset user state on error
      } finally {
        // Ensure loading is set to false after processing, even if errors occurred
        setLoading(false);
      }
>>>>>>> Stashed changes
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change', { event, hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null); // Update user on change
        // Removed company state reset logic
      }
    );
    return () => subscription.unsubscribe();
  }, []);

<<<<<<< Updated upstream
  // --- Removed useEffect for refreshUserData ---
  // useEffect(() => { ... removed ... }, [user]);

  // --- Removed refreshUserData function ---
  // const refreshUserData = async (isRetry = false) => { ... removed ... };

  // Sign in function - simplified, no company logic
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    setLoading({ auth: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // User state will update via onAuthStateChange listener
      return { error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(`Sign in failed: ${error.message}`);
      return { error: error as Error };
    } finally {
      setLoading({ auth: false });
    }
  };

  // Sign up function - simplified, no company logic
  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<{ error: Error | null }> => {
    setLoading({ auth: true });
    try {
      // Include first/last name in metadata for profile creation elsewhere if needed
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { first_name: firstName, last_name: lastName }, emailRedirectTo: `${window.location.origin}/email-confirmation` }
      });
      if (error) throw error;
      // User state will update via onAuthStateChange listener after email confirmation
      // Or handle immediate profile/company creation via a separate onboarding flow/trigger
      toast.info('Sign up successful! Please check your email to confirm.');
      return { error: null };
=======
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
    setLoading(true); // Re-enable setting loading state
    console.log("authProvider Signing in user:", email);
    try {
      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('signinData', data);
      console.log("signInError", error);

      if (error) throw error; // Throw error to be caught by the catch block

      console.log("Authentication successful, proceeding to fetch user data");

      // Ensure user data is loaded after sign in
      if (data?.user) { // Check if data and data.user exist
        const extendedUser = await fetchUserData(data.user.id);
        setUser(extendedUser as ExtendedUser);
        console.log("User signed in and profile loaded:", {
          id: data.user.id,
          email: data.user.email,
          hasProfile: !!extendedUser?.profile, // Safe access
          companyCount: extendedUser?.companies?.length || 0 // Safe access
        });
      } else {
        // Handle case where sign-in is successful but no user data is returned (should not happen with password auth)
        console.warn("Sign-in successful but no user data returned.");
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
      // Re-throw the error if needed elsewhere, or just handle it here
      // throw error;
    } finally {
      setLoading(false); // Ensure loading is set to false regardless of success or failure
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => { // Keep signUp definition
    try {
      console.log("authProvidersignUp")
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
      console.log("afterSignUp")
      if (error) throw error;
      console.log("noError")
      // If successful but no user was returned (email confirmation required)
      if (!data.user) {
        toast.success("Sign up successful! Please check your email for confirmation.");
        return;
      }

      toast.success("Account created successfully!");
>>>>>>> Stashed changes
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(`Sign up failed: ${error.message}`);
      return { error: error as Error };
    } finally {
<<<<<<< Updated upstream
      setLoading({ auth: false });
=======
      console.log("finally")
      setLoading(false);
>>>>>>> Stashed changes
    }
  };

  // Sign out function - simplified
  const signOut = async () => {
    setLoading({ auth: true });
    try {
      await supabase.auth.signOut();
      // User state will update via onAuthStateChange listener
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error("Error signing out");
    } finally {
      setLoading({ auth: false });
    }
  };

<<<<<<< Updated upstream
  // --- Removed ensureUserHasAdminCompany function ---

=======
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
  console.log("authProviderLoading", loading)
>>>>>>> Stashed changes
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signUp,
        signOut,
        loading,
        // Removed company properties from value
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
