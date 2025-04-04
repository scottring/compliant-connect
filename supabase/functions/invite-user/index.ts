import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure environment variables are set
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase URL or Service Role Key environment variables.");
    }
    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl) {
      // Fallback for local dev if SITE_URL isn't set, but log a warning.
      // In production/staging, this should ideally throw an error or have a default.
      console.warn("SITE_URL environment variable not set. Falling back to localhost:8080 for redirectTo.");
      // throw new Error("Missing SITE_URL environment variable."); // Uncomment this for stricter production checks
    }

    // Create Supabase Admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    // Destructure the new ID from the body
    const { email, invitingCompanyId, invitingUserId, supplierName, contactName, invited_supplier_company_id } = await req.json();

    // Basic validation
    if (!email) {
      throw new Error("Email is required.");
    }
    // Add more validation as needed (e.g., check if user is already registered)

    // Prepare metadata to store with the invited user (optional)
    const userMetadata = {
      invited_by_user_id: invitingUserId,
      invited_to_company_id: invitingCompanyId,
      invited_supplier_company_id: invited_supplier_company_id, // Store the supplier company ID
      invited_supplier_name: supplierName, // Store supplier name if needed later
      invited_contact_name: contactName, // Store contact name if needed later
      // Add any other relevant metadata
    };

    // Invite the user using the Admin API
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: userMetadata,
        // Construct redirectTo URL dynamically
        // Use SITE_URL from env, fallback to localhost for local dev if not set
        redirectTo: `${siteUrl || 'http://localhost:8080'}/invite/register` // Point to the new dedicated registration page
      }
    );

    if (error) {
      console.error("Error inviting user:", error);
      // Check for specific errors, e.g., user already exists
      if (error.message.includes("User already registered")) {
         return new Response(JSON.stringify({ error: "User already registered." }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
           status: 409, // Conflict
         });
      }
      throw error; // Re-throw other errors
    }

    // Return success response
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in invite-user function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});