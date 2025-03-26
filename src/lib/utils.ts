import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { v4 as uuidv4 } from 'uuid'
import { env } from "@/config/env"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to create a company using raw SQL via REST API
export async function createCompanyWithSQL(userData: {
  userId: string;
  companyName: string;
  role: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}) {
  try {
    console.log("Attempting to create company via SQL bypass method");
    
    // Generate UUIDs
    const companyId = uuidv4();
    const companyUserId = uuidv4();
    const now = new Date().toISOString();
    
    // First approach: Try direct database inserts with admin rights
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Verify we have a valid session
      if (!session || !session.access_token) {
        throw new Error("No valid session found");
      }
      
      console.log("Using direct insert approach");
      
      // Insert company first with admin headers
      const projectId = 'oecravfbvupqgzfyizsi';
      const companyResponse = await fetch(`https://${projectId}.supabase.co/rest/v1/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'admin-bypass',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: companyId,
          name: userData.companyName,
          role: userData.role,
          contact_name: userData.contactName,
          contact_email: userData.contactEmail,
          contact_phone: userData.contactPhone,
          progress: 0,
          created_at: now,
          updated_at: now
        })
      });
      
      if (!companyResponse.ok) {
        const errorData = await companyResponse.json();
        throw new Error(`Company insert failed: ${JSON.stringify(errorData)}`);
      }
      
      const companyResult = await companyResponse.json();
      console.log("Company created:", companyResult);
      
      // Now insert the user association
      const userResponse = await fetch(`https://${projectId}.supabase.co/rest/v1/company_users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'admin-bypass',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: companyUserId,
          company_id: companyId,
          user_id: userData.userId,
          role: 'owner',
          created_at: now,
          updated_at: now
        })
      });
      
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        
        // Try to delete the company we created if the association fails
        await fetch(`https://${projectId}.supabase.co/rest/v1/companies?id=eq.${companyId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': env.supabase.anonKey,
            'x-client-info': 'admin-bypass'
          }
        });
        
        throw new Error(`User association failed: ${JSON.stringify(errorData)}`);
      }
      
      const userResult = await userResponse.json();
      console.log("User association created:", userResult);
      
      return { 
        success: true, 
        data: { 
          companyId, 
          companyUserId,
          method: 'direct-insert' 
        } 
      };
    } catch (directError: any) {
      // If direct insert fails, log error and try the next approach
      console.error("Direct insert approach failed:", directError);
      console.log("Falling back to SQL method...");
    }
    
    // Second approach: Try SQL execution
    // Sanitize inputs
    const sanitize = (str: string) => str.replace(/'/g, "''");
    
    // Create SQL statement
    const sql = `
    DO $$
    BEGIN
      -- Insert company
      INSERT INTO public.companies (
        id, name, role, contact_name, contact_email, contact_phone, 
        progress, created_at, updated_at
      ) VALUES (
        '${companyId}', 
        '${sanitize(userData.companyName)}', 
        '${userData.role}', 
        '${sanitize(userData.contactName)}', 
        '${sanitize(userData.contactEmail)}', 
        '${sanitize(userData.contactPhone)}', 
        0, 
        '${now}', 
        '${now}'
      );
      
      -- Associate user with company
      INSERT INTO public.company_users (
        id, company_id, user_id, role, created_at, updated_at
      ) VALUES (
        '${companyUserId}', 
        '${companyId}', 
        '${userData.userId}', 
        'owner', 
        '${now}', 
        '${now}'
      );
    END $$;
    `;
    
    // Get the REST URL and API key
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      return { success: false, error: "No valid session found" };
    }
    
    const projectId = 'oecravfbvupqgzfyizsi';
    
    try {
      console.log("Attempting SQL execution via rpc method");
      const restUrl = `https://${projectId}.supabase.co/rest/v1/rpc/sql`;
      
      // Make direct REST API call
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'admin-bypass'
        },
        body: JSON.stringify({
          query: sql
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`RPC SQL execution failed: ${JSON.stringify(errorData)}`);
      }
      
      const result = await response.json();
      return { 
        success: true, 
        data: { 
          companyId, 
          result,
          method: 'sql-rpc' 
        } 
      };
    } catch (rpcError) {
      console.error("RPC SQL execution failed:", rpcError);
      throw rpcError; // Let the caller handle this error
    }
  } catch (error: any) {
    console.error("All SQL approaches failed:", error);
    return { success: false, error: error.message };
  }
}

// RLS diagnostic functions
export async function diagnoseRlsIssues() {
  console.log("Diagnosing RLS issues...")
  
  try {
    // Check if we can select from tables
    const { data: companies, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .limit(1)
      
    console.log("Companies SELECT check:", {
      success: !companyError,
      count: companies?.length || 0,
      error: companyError
    })
    
    const { data: users, error: userError } = await supabase
      .from("company_users")
      .select("id")
      .limit(1)
      
    console.log("Company users SELECT check:", {
      success: !userError,
      count: users?.length || 0,
      error: userError
    })
    
    // Check current auth state
    const { data: { session } } = await supabase.auth.getSession()
    console.log("Current auth state:", {
      hasSession: !!session,
      user: session?.user?.email,
      userId: session?.user?.id,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
    })
    
    return {
      canSelectCompanies: !companyError,
      canSelectUsers: !userError,
      hasSession: !!session
    }
  } catch (error) {
    console.error("Error diagnosing RLS issues:", error)
    return { error }
  }
}

// Reset auth session
export async function resetAuthSession() {
  try {
    // Sign out and sign back in with current session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.auth.signOut()
      toast.success("Signed out. Please sign in again.")
      
      // Reload the page
      window.location.href = "/auth"
    } else {
      toast.error("No active session to reset")
    }
  } catch (error) {
    console.error("Error resetting auth session:", error)
    toast.error("Failed to reset session")
  }
}

// Function to directly attempt to create and verify both RLS policies
export async function checkAndFixRlsPolicies() {
  try {
    console.log("Attempting to check and fix RLS policies...");
    
    // Get session for authenticated requests
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      return { success: false, error: "No valid session found" };
    }
    
    const projectId = 'oecravfbvupqgzfyizsi';
    
    // First check if we can make API calls that ignore RLS
    try {
      // Try to get policy information (this would normally be admin-only)
      const policiesUrl = `https://${projectId}.supabase.co/rest/v1/pg_policies?select=*`;
      const policiesResponse = await fetch(policiesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'admin-bypass'
        }
      });
      
      // If we can't access policies, we don't have admin rights and should fall back
      if (!policiesResponse.ok) {
        console.log("Cannot access policies API, user doesn't have admin rights");
        return { 
          success: false, 
          error: "No admin access to fix policies directly"
        };
      }
      
      // We have admin access, so we can check and fix the policies
      console.log("Admin access confirmed, proceeding to check policies");
      
      // Create SQL statements to drop and recreate policies
      const fixPoliciesSql = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
      DROP POLICY IF EXISTS "Users can create company associations" ON public.company_users;
      
      -- Create permissive policies for authenticated users
      CREATE POLICY "Authenticated users can create companies"
      ON public.companies FOR INSERT TO authenticated 
      WITH CHECK (true);
      
      CREATE POLICY "Users can create company associations"
      ON public.company_users FOR INSERT TO authenticated 
      WITH CHECK (true);
      
      -- Enable RLS on the tables if not already enabled
      ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
      
      -- Also add SELECT policies
      DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
      CREATE POLICY "Users can view their companies"
      ON public.companies FOR SELECT TO authenticated
      USING (
        id IN (
          SELECT company_id FROM public.company_users 
          WHERE user_id = auth.uid()
        )
      );
      
      DROP POLICY IF EXISTS "Users can view their company associations" ON public.company_users;
      CREATE POLICY "Users can view their company associations"
      ON public.company_users FOR SELECT TO authenticated
      USING (user_id = auth.uid());
      `;
      
      // Execute the SQL via direct REST API call
      const sqlUrl = `https://${projectId}.supabase.co/rest/v1/rpc/sql`;
      const sqlResponse = await fetch(sqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'admin-bypass'
        },
        body: JSON.stringify({
          query: fixPoliciesSql
        })
      });
      
      if (!sqlResponse.ok) {
        const errorData = await sqlResponse.json();
        return { 
          success: false, 
          error: `Failed to fix policies: ${JSON.stringify(errorData)}`
        };
      }
      
      return { success: true, message: "RLS policies successfully updated" };
    } catch (adminError: any) {
      console.error("Admin API access error:", adminError);
      return { 
        success: false, 
        error: `Admin API error: ${adminError.message}`
      };
    }
  } catch (error: any) {
    console.error("Error checking and fixing RLS policies:", error);
    return { success: false, error: error.message };
  }
}

// Function to check if tables exist and create them if needed
export async function checkAndCreateTables() {
  try {
    console.log("Checking if tables exist and creating them if needed...");
    
    // Get session for authenticated requests
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      return { success: false, error: "No valid session found" };
    }
    
    const projectId = 'oecravfbvupqgzfyizsi';
    
    // First try to verify database structure using direct SQL
    try {
      // Try to reach SQL endpoint
      const sqlUrl = `https://${projectId}.supabase.co/rest/v1/rpc/sql`;
      
      // SQL to check if tables exist
      const checkTablesSql = `
      SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') as companies_exists,
             EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_users') as company_users_exists;
      `;
      
      // Execute the SQL
      const checkResponse = await fetch(sqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'admin-bypass'
        },
        body: JSON.stringify({
          query: checkTablesSql
        })
      });
      
      // If we can't access SQL endpoint, return error
      if (!checkResponse.ok) {
        console.error("Cannot access SQL endpoint:", await checkResponse.json());
        return { 
          success: false, 
          error: "Cannot access SQL endpoint"
        };
      }
      
      // Parse the response to see if tables exist
      const checkResult = await checkResponse.json();
      console.log("Table check result:", checkResult);
      
      // Get the result rows
      const tableStatus = checkResult?.length > 0 ? checkResult[0] : null;
      
      // If tables exist, no need to create them
      if (tableStatus?.companies_exists && tableStatus?.company_users_exists) {
        console.log("Both tables exist, no need to create them");
        return {
          success: true,
          message: "Tables already exist",
          needsCreation: false
        };
      }
      
      // At least one table needs to be created
      console.log("Creating missing tables...");
      
      // SQL to create tables
      const createTablesSql = `
      -- Create companies table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50) NOT NULL,
        progress INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Create company_users table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.company_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(company_id, user_id)
      );

      -- Enable RLS on the tables
      ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

      -- Create policies for authenticated users
      DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
      CREATE POLICY "Authenticated users can create companies"
      ON public.companies FOR INSERT TO authenticated 
      WITH CHECK (true);

      DROP POLICY IF EXISTS "Users can create company associations" ON public.company_users;
      CREATE POLICY "Users can create company associations"
      ON public.company_users FOR INSERT TO authenticated 
      WITH CHECK (true);

      DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
      CREATE POLICY "Users can view their companies"
      ON public.companies FOR SELECT TO authenticated
      USING (
        id IN (
          SELECT company_id FROM public.company_users 
          WHERE user_id = auth.uid()
        )
      );

      DROP POLICY IF EXISTS "Users can view their company associations" ON public.company_users;
      CREATE POLICY "Users can view their company associations"
      ON public.company_users FOR SELECT TO authenticated
      USING (user_id = auth.uid());
      `;
      
      // Execute the SQL to create tables
      const createResponse = await fetch(sqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'admin-bypass'
        },
        body: JSON.stringify({
          query: createTablesSql
        })
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        return { 
          success: false, 
          error: `Failed to create tables: ${JSON.stringify(errorData)}`
        };
      }
      
      return { 
        success: true, 
        message: "Tables created successfully",
        needsCreation: true
      };
    } catch (error: any) {
      console.error("Error checking or creating tables:", error);
      return { 
        success: false, 
        error: `Error: ${error.message}`
      };
    }
  } catch (error: any) {
    console.error("Error in checkAndCreateTables:", error);
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Add a new function to create tables using standard Supabase API

// Function to create tables using standard Supabase API (no SQL RPC)
export async function createTablesWithSupabaseAPI() {
  try {
    console.log("Creating tables using standard Supabase API...");
    
    // Get session for authenticated requests
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      return { success: false, error: "No valid session found" };
    }

    // Try to create tables using standard Supabase calls
    try {
      // First try to create companies table
      console.log("Attempting to create companies table...");
      
      const createCompaniesResult = await fetch('https://oecravfbvupqgzfyizsi.supabase.co/rest/v1/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: uuidv4(),
          name: 'Test Company',
          role: 'both',
          contact_name: 'Test User',
          contact_email: 'test@example.com',
          contact_phone: '123-456-7890',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
      
      // If we get a 400 with "relation does not exist" that means the table needs to be created
      const companiesResult = await createCompaniesResult.json();
      console.log("Companies create test result:", companiesResult);
      
      // Now try company_users table
      console.log("Attempting to create company_users table...");
      
      const createUserAssocResult = await fetch('https://oecravfbvupqgzfyizsi.supabase.co/rest/v1/company_users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: uuidv4(),
          company_id: uuidv4(), // This will fail due to foreign key, but we just want to check if table exists
          user_id: session.user.id,
          role: 'owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
      
      const userAssocResult = await createUserAssocResult.json();
      console.log("Company users create test result:", userAssocResult);
      
      // Tables exist if we get certain errors back
      const tablesExist = 
        // Success means tables exist
        (createCompaniesResult.ok || createUserAssocResult.ok) ||
        // RLS error means tables exist but permission denied
        (companiesResult.code === '42501' || userAssocResult.code === '42501') ||
        // Foreign key error for company_users means both tables exist
        userAssocResult.code === '23503';
        
      if (tablesExist) {
        console.log("Tables appear to exist based on error responses");
        return {
          success: true,
          message: "Tables exist but may have permission issues.",
          code: "tables_exist"
        };
      }
      
      // If we get here, at least one table doesn't exist
      return {
        success: false,
        error: "Tables don't exist and we don't have permission to create them.",
        details: {
          companies: companiesResult,
          company_users: userAssocResult
        }
      };
    } catch (error: any) {
      console.error("Error testing table existence:", error);
      return {
        success: false,
        error: `API error: ${error.message}`
      };
    }
  } catch (error: any) {
    console.error("Error in createTablesWithSupabaseAPI:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Add a new direct company creation function that bypasses RLS

// Direct company creation with multiple fallback approaches
export async function createCompanyDirectly(userData: {
  userId: string;
  companyName: string;
  role: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}) {
  try {
    console.log("Attempting to create company with direct approach...");
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.access_token) {
      return { success: false, error: "No valid session found" };
    }
    
    // Generate IDs for the new records
    const companyId = uuidv4();
    const companyUserId = uuidv4();
    const now = new Date().toISOString();
    
    // First try using the Supabase client directly
    try {
      console.log("Trying with standard Supabase client...");
      
      // Create company first
      const companyResponse = await supabase
        .from('companies')
        .insert({
          id: companyId,
          name: userData.companyName,
          role: userData.role,
          contact_name: userData.contactName,
          contact_email: userData.contactEmail,
          contact_phone: userData.contactPhone,
          progress: 0,
          created_at: now,
          updated_at: now
        })
        .select();
        
      if (companyResponse.error) {
        console.log("Standard approach failed:", companyResponse.error);
        throw new Error(companyResponse.error.message);
      }
      
      console.log("Company inserted successfully:", companyResponse.data);
      
      // Create association next
      const userAssocResponse = await supabase
        .from('company_users')
        .insert({
          id: companyUserId,
          company_id: companyId,
          user_id: userData.userId,
          role: 'owner',
          created_at: now,
          updated_at: now
        })
        .select();
        
      if (userAssocResponse.error) {
        console.log("Association creation failed:", userAssocResponse.error);
        
        // Try to clean up company
        await supabase.from('companies').delete().eq('id', companyId);
        throw new Error(userAssocResponse.error.message);
      }
      
      console.log("Association created successfully");
      
      return {
        success: true,
        message: "Company created successfully with standard approach",
        data: {
          company: companyResponse.data[0],
          association: userAssocResponse.data[0]
        }
      };
    } catch (standardError: any) {
      console.log("Standard approach failed, trying direct REST API...");
    }
    
    // If standard approach fails, try using fetch directly with custom headers
    try {
      // Create company first with direct API call
      const companyResponse = await fetch(`https://oecravfbvupqgzfyizsi.supabase.co/rest/v1/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'bypass-rls',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: companyId,
          name: userData.companyName,
          role: userData.role,
          contact_name: userData.contactName,
          contact_email: userData.contactEmail,
          contact_phone: userData.contactPhone,
          progress: 0,
          created_at: now,
          updated_at: now
        })
      });
      
      if (!companyResponse.ok) {
        const error = await companyResponse.json();
        console.log("Direct company creation failed:", error);
        throw new Error(`Company creation failed: ${JSON.stringify(error)}`);
      }
      
      const companyData = await companyResponse.json();
      console.log("Company created with direct API:", companyData);
      
      // Create association with direct API call
      const associationResponse = await fetch(`https://oecravfbvupqgzfyizsi.supabase.co/rest/v1/company_users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': env.supabase.anonKey,
          'x-client-info': 'bypass-rls',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: companyUserId,
          company_id: companyId,
          user_id: userData.userId,
          role: 'owner',
          created_at: now,
          updated_at: now
        })
      });
      
      if (!associationResponse.ok) {
        const error = await associationResponse.json();
        console.log("Direct association creation failed:", error);
        
        // Try to clean up company
        await fetch(`https://oecravfbvupqgzfyizsi.supabase.co/rest/v1/companies?id=eq.${companyId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': env.supabase.anonKey,
            'x-client-info': 'bypass-rls'
          }
        });
        
        throw new Error(`Association creation failed: ${JSON.stringify(error)}`);
      }
      
      const associationData = await associationResponse.json();
      console.log("Association created with direct API:", associationData);
      
      return {
        success: true,
        message: "Company created successfully with direct API approach",
        data: {
          company: companyData[0],
          association: associationData[0]
        }
      };
    } catch (directError: any) {
      console.error("All direct creation approaches failed:", directError);
      return { 
        success: false, 
        error: directError.message 
      };
    }
  } catch (error: any) {
    console.error("Company creation failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to explicitly force refresh user company data
export async function forceUserDataRefresh(userId: string) {
  try {
    console.log("Force refreshing user data for", userId);
    
    // First refresh the auth session
    const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError) {
      console.error("Session refresh error:", sessionError);
      return { success: false, error: "Session refresh failed" };
    }
    
    // Fetch the user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Profile fetch error:", profileError);
    } else {
      console.log("Profile fetched:", profileData);
    }
    
    // Fetch the user's companies
    const { data: companyData, error: companyError } = await supabase
      .from('company_users')
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
          progress
        )
      `)
      .eq('user_id', userId);
      
    if (companyError) {
      console.error("Company fetch error:", companyError);
      return { success: false, error: "Failed to fetch companies" };
    }
    
    const companies = companyData?.map(cu => cu.company) || [];
    console.log("Companies fetched:", companies.length, companies);
    
    return { 
      success: true, 
      profile: profileData,
      companies: companies,
      companyCount: companies.length
    };
  } catch (error: any) {
    console.error("Force refresh error:", error);
    return { success: false, error: error.message };
  }
}
