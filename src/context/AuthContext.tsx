import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// Removed Company, UserCompany, ExtendedUser, UserRole imports as company logic is removed
// import { Company, UserCompany, ExtendedUser, UserRole } from '@/types/auth';

// Simplified loading state - focused only on auth process itself
export interface LoadingState {
  auth: boolean;
}

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
  const [user, setUser] = useState<User | null>(null); // Use Supabase User type
  const [loading, setLoading] = useState<LoadingState>({
    auth: true, // Start true until initial session check completes
  });
  // Removed company state
  // const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  // const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  // --- Removed Company Association Logic ---
  // const _ensureUserCompanyAssociation = ... removed ...

  // Set up auth state listener
  useEffect(() => {
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
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(`Sign up failed: ${error.message}`);
      return { error: error as Error };
    } finally {
      setLoading({ auth: false });
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

  // --- Removed ensureUserHasAdminCompany function ---

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
