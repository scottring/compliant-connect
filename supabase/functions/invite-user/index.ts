import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate all required environment variables
    const requiredEnvVars = {
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      SITE_URL: Deno.env.get("SITE_URL"),
    };

    // Check for missing environment variables
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error("Missing environment variables:", missingVars);
      throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }

    // Create Supabase Admin client
    const supabaseAdmin = createClient(
      requiredEnvVars.SUPABASE_URL,
      requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse and validate request body
    const { email, invitingCompanyId, invitingUserId, supplierName, contactName, invited_supplier_company_id } = await req.json();

    // Validate required fields
    if (!email || !invitingCompanyId || !invitingUserId || !invited_supplier_company_id) {
      console.error("Missing required fields:", { email, invitingCompanyId, invitingUserId, invited_supplier_company_id });
      throw new Error("Missing required fields in request body");
    }

    // Prepare metadata
    const userMetadata = {
      invited_by_user_id: invitingUserId,
      invited_to_company_id: invitingCompanyId,
      invited_supplier_company_id: invited_supplier_company_id,
      invited_supplier_name: supplierName,
      invited_contact_name: contactName,
    };

    console.log("Inviting user with metadata:", userMetadata);
    console.log("Redirect URL:", `${requiredEnvVars.SITE_URL}/invite/register`);

    // Invite the user
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: userMetadata,
      redirectTo: `${requiredEnvVars.SITE_URL}/invite/register`,
    });

    if (error) {
      console.error("Error inviting user:", error);
      
      if (error.message?.includes("User already registered")) {
        return new Response(
          JSON.stringify({ error: "User already registered." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 409,
          }
        );
      }
      
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
