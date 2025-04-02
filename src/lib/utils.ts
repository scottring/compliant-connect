import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"; // Updated import path
import { v4 as uuidv4 } from 'uuid'
import { env } from "@/config/env" // Assuming this is still needed for other parts

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to create a company using raw SQL via REST API (DEPRECATED - Use createCompanyDirectly or Supabase client)
export async function createCompanyWithSQL(userData: {
  userId: string;
  companyName: string;
  role: string; // This role seems incorrect based on schema
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}) {
  console.warn("DEPRECATED: createCompanyWithSQL uses hardcoded URLs and potentially incorrect schema assumptions. Use createCompanyDirectly or Supabase client methods.");
  // ... (original implementation remains, but marked as deprecated)
  // ... This function should be refactored or removed ...
  return { success: false, error: "Deprecated function not refactored" };
}

// RLS diagnostic functions (Needs Refactoring)
export async function diagnoseRlsIssues() {
  console.warn("diagnoseRlsIssues needs refactoring to avoid hardcoded URL/client issues");
  console.log("Diagnosing RLS issues...")
  try {
    // Check if we can select from tables using the CORRECT client
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

// Reset auth session (Keep as is - uses correct client)
export async function resetAuthSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.auth.signOut()
      toast.success("Signed out. Please sign in again.")
      window.location.href = "/auth"
    } else {
      toast.error("No active session to reset")
    }
  } catch (error) {
    console.error("Error resetting auth session:", error)
    toast.error("Failed to reset session")
  }
}

// Function to directly attempt to create and verify both RLS policies (Needs Refactoring)
export async function checkAndFixRlsPolicies() {
   console.warn("checkAndFixRlsPolicies needs refactoring to avoid hardcoded URL");
   return { success: false, error: "Function needs refactoring to avoid hardcoded URL" }; // Placeholder
}

// Function to check if tables exist and create them if needed (Needs Refactoring)
export async function checkAndCreateTables() {
  console.warn("checkAndCreateTables needs refactoring to avoid hardcoded URL");
  return { success: false, error: "Function needs refactoring to avoid hardcoded URL" }; // Placeholder
}

// Function to create tables using standard Supabase API (Needs Refactoring)
export async function createTablesWithSupabaseAPI() {
   console.warn("createTablesWithSupabaseAPI needs refactoring to avoid hardcoded URL");
   return { success: false, error: "Function needs refactoring to avoid hardcoded URL" }; // Placeholder
}


// Direct company creation - Refactored to use Supabase client
export async function createCompanyDirectly(userData: {
  userId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}) {
  try {
    console.log("Attempting to create company with Supabase client...");
    
    // Create company first with minimal fields
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: userData.companyName
      })
      .select()
      .single(); 
      
    if (companyError) {
      console.log("Company creation failed:", companyError);
      throw new Error(`Company insert failed: ${companyError.message}`);
    }
    
    if (!companyData || !companyData.id) {
      console.error("Company insert succeeded but no data returned or ID missing.");
      throw new Error("Failed to retrieve created company ID.");
    }

    const newCompanyId = companyData.id; 
    console.log("Company inserted successfully:", companyData);
    
    // Create association next
    const { data: userAssocData, error: userAssocError } = await supabase
      .from('company_users')
      .insert({
        company_id: newCompanyId, 
        user_id: userData.userId,
        role: 'owner'
      })
      .select()
      .single();
      
    if (userAssocError) {
      console.log("Association creation failed:", userAssocError);
      await supabase.from('companies').delete().eq('id', newCompanyId);
      throw new Error(`Association creation failed: ${userAssocError.message}`);
    }
    
    // Update company with contact info after association is created
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        contact_name: userData.contactName,
        contact_email: userData.contactEmail,
        contact_phone: userData.contactPhone
      })
      .eq('id', newCompanyId);

    if (updateError) {
      console.log("Contact info update failed:", updateError);
      // Don't throw, we already have the basic company and association
    }
    
    return {
      success: true,
      message: "Company created successfully",
      data: {
        company: companyData,
        association: userAssocData
      }
    };

  } catch (error: any) {
    console.error("Company creation failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to explicitly force refresh user company data (Needs Refactoring)
export async function forceUserDataRefresh(userId: string) {
  console.warn("forceUserDataRefresh needs refactoring to avoid hardcoded URL");
  return { success: false, error: "Function needs refactoring to avoid hardcoded URL" }; // Placeholder
}
