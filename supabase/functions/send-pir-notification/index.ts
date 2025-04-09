// compliant-connect/supabase/functions/send-pir-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' // Keep for potential future use or admin tasks
import { corsHeaders } from '../_shared/cors.ts'

interface NotificationPayload {
  to: string
  subject: string
  html_body: string
  from_email: string
  from_name: string
}

serve(async (req: Request) => {
  console.log('Received PIR notification request:', req.method, req.url)
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- Environment Variable Check ---
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    console.log('SENDGRID_API_KEY:', SENDGRID_API_KEY ? SENDGRID_API_KEY : 'Missing');
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
    console.log('payload.from_email:', payload.from_email ? payload.from_email : 'Missing');
    if (!payload.from_email) {
      throw new Error('Missing from_email in payload. Please provide a sender email.');
    }
    console.log('payload.from_name:', payload.from_name ? payload.from_name : 'Missing');
    if (!payload.from_name) {
      throw new Error('Missing from_name in payload. Please provide a sender name.');
    }
    console.log('payload.to:', payload.to ? payload.to : 'Missing');
    if (!payload.to) {
      throw new Error('Missing to in payload. Please provide a recipient email.');
    }
    console.log('payload.subject:', payload.subject ? payload.subject : 'Missing');
    if (!payload.subject) {
      throw new Error('Missing subject in payload. Please provide a subject.');
    }
    console.log('payload.html_body:', payload.html_body ? payload.html_body : 'Missing');
    if (!payload.html_body) {
      throw new Error('Missing html_body in payload. Please provide HTML content for the email.');
    }

    // --- SendGrid API Call ---
    console.log(`Sending email to ${payload.to} with subject "${payload.subject}"`)
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to }] }],
        from: {
          email: payload.from_email,
          name: payload.from_name
        },
        subject: payload.subject,
        content: [
          {
            type: 'text/html',
            value: payload.html_body
          },
        ],
      }),
    });
    console.log(`Sent email to ${payload.to} with subject ${payload.subject} with status ${sendgridResponse.status}`);

    // --- Check SendGrid Response ---
    if (!sendgridResponse.ok) {
      console.log('SendGrid response not ok:', sendgridResponse.status, sendgridResponse.statusText);
      // Try to get more details from the error response body
      let errorBodyText = await sendgridResponse.text(); // Read as text first
      let errorDetails = errorBodyText;
      try {
        errorDetails = JSON.stringify(JSON.parse(errorBodyText)); // Try parsing as JSON
      } catch (e) { /* Ignore parsing error, use raw text */ }
      throw new Error(`SendGrid API Error: ${sendgridResponse.status} ${sendgridResponse.statusText} - ${errorDetails}`);
    } else {
      console.log('SendGrid response ok:', sendgridResponse.status, sendgridResponse.statusText);
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