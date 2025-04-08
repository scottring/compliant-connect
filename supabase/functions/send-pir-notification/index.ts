// compliant-connect/supabase/functions/send-pir-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' // Keep for potential future use or admin tasks
import { corsHeaders } from '../_shared/cors.ts'

interface NotificationPayload {
  to: string; // Recipient email
  subject: string;
  html_body: string; // HTML content for the email
  from_email?: string; // Optional: Sender email (defaults below)
  from_name?: string; // Optional: Sender name
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Environment Variable Check ---
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      throw new Error('Missing SENDGRID_API_KEY. Configure Supabase secrets.');
    }
    // We might still need Supabase URL/Key if doing other DB operations, but not for SendGrid directly
    // const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // if (!supabaseUrl || !serviceRoleKey) {
    //   throw new Error('Missing Supabase URL or Service Role Key environment variables.');
    // }

    // --- Parse Request Body ---
    const payload: NotificationPayload = await req.json();
    if (!payload.to || !payload.subject || !payload.html_body) {
      throw new Error('Missing required fields: to, subject, html_body');
    }

    // --- SendGrid API Call ---
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }], // SendGrid structure
        from: {
          email: payload.from_email || 'admin@stacksdata.com', // CHANGE THIS to your verified SendGrid sender email
          name: payload.from_name || 'Stacks Data' // Default sender name
        },
        subject: payload.subject,
        content: [
          {
            type: 'text/html',
            value: payload.html_body, // Use the HTML body directly
          },
        ],
      }),
    });

    // --- Check SendGrid Response ---
    if (!sendgridResponse.ok) {
      // Try to get more details from the error response body
      let errorBodyText = await sendgridResponse.text(); // Read as text first
      let errorDetails = errorBodyText;
      try {
        errorDetails = JSON.stringify(JSON.parse(errorBodyText)); // Try parsing as JSON
      } catch (e) { /* Ignore parsing error, use raw text */ }
      throw new Error(`SendGrid API Error: ${sendgridResponse.status} ${sendgridResponse.statusText} - ${errorDetails}`);
    }

    // Assuming success if response is ok (status 2xx)
    const data = { sendgrid_status: sendgridResponse.status }; // Minimal success data
    const error = null;

    // --- Return Success ---
    return new Response(JSON.stringify({ success: true, message: 'Notification sent via SendGrid.', data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // console.error('Error in send-pir-notification function:', error) // Log removed
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})