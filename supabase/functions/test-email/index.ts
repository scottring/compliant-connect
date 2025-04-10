// Follow this setup guide to integrate the Deno runtime:
// https://deno.land/manual/examples/deploy_node_server
// Learn more about Deno on Supabase: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get SendGrid API key from environment
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is not set");
    }
    
    // Get sender email from environment
    const senderEmail = Deno.env.get("SENDER_EMAIL");
    if (!senderEmail) {
      throw new Error("SENDER_EMAIL is not set");
    }

    // Log SITE_URL for debugging
    const siteUrl = Deno.env.get("SITE_URL");
    console.log("SITE_URL from environment:", siteUrl);

    // Parse request body to get recipient email
    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      throw new Error("Invalid JSON in request body");
    }

    const toEmail = payload.to;
    if (!toEmail) {
      throw new Error("No recipient email provided in request");
    }

    // Configure SendGrid
    sgMail.setApiKey(sendgridApiKey);

    // Create email message
    const msg = {
      to: toEmail,
      from: senderEmail,
      subject: 'Test Email from CompliantConnect',
      html: '<p>This is a test email to verify SendGrid integration with Supabase Edge Functions.</p>',
    };

    // Send email
    console.log(`Sending test email to ${toEmail}`);
    await sgMail.send(msg);
    console.log('Test email sent successfully');
    
    return new Response(
      JSON.stringify({ success: true, message: "Test email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error(`Error sending test email: ${error.message}`, error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54330/functions/v1/test-email' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
