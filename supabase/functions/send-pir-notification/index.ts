// compliant-connect/supabase/functions/send-pir-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req)=>{
  console.log('Received PIR notification request:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    const headers = {
      ...corsHeaders,
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    return new Response('ok', { headers: headers });
  }

  // Declare sendgridResponse here so it's accessible after the inner try-catch
  let sendgridResponse: Response | undefined;

  try {
    // --- Environment Variable Check ---
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    console.log('SENDGRID_API_KEY retrieved:', SENDGRID_API_KEY ? 'Exists' : 'Missing'); // More specific log
    if (!SENDGRID_API_KEY) {
      throw new Error('Missing SENDGRID_API_KEY. Configure Supabase secrets.');
    }

    // --- Parse Request Body ---
    const payload = await req.json();
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
    console.log('payload.html_body:', payload.html_body ? 'Exists' : 'Missing'); // Check existence, don't log full body
    if (!payload.html_body) {
      throw new Error('Missing html_body in payload. Please provide HTML content for the email.');
    }

    // --- SendGrid API Call ---
    console.log(`Attempting to send email via SendGrid to ${payload.to}`); // Log before fetch

    try { // Wrap fetch in its own try-catch
      sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SENDGRID_API_KEY}` // Requires valid key
        },
        body: JSON.stringify({
          personalizations: [ { to: [ { email: payload.to } ] } ],
          from: { email: payload.from_email, name: payload.from_name },
          subject: payload.subject,
          content: [ { type: 'text/html', value: payload.html_body } ]
        })
      });
      // Check if sendgridResponse is defined before accessing status
      if (sendgridResponse) {
          console.log(`SendGrid fetch completed with status: ${sendgridResponse.status}`); // Log after fetch attempt
      } else {
          console.log('SendGrid fetch completed but response is undefined.'); // Should not happen if fetch doesn't throw
      }
    } catch (fetchError) {
      console.error('Error during SendGrid fetch call:', fetchError);
      // Re-throw to be caught by the outer catch block
      throw new Error(`Failed during SendGrid API fetch: ${fetchError.message}`);
    }

    // Ensure sendgridResponse is defined before proceeding
    if (!sendgridResponse) {
        throw new Error('SendGrid response was unexpectedly undefined after fetch.');
    }

    console.log(`Processing SendGrid response for email to ${payload.to}. Status: ${sendgridResponse.status}`);

    // --- Check SendGrid Response ---
    if (!sendgridResponse.ok) { // Status is not 2xx
      console.log('SendGrid response not ok:', sendgridResponse.status, sendgridResponse.statusText);
      let errorBodyText = await sendgridResponse.text(); // Read as text first
      let errorDetails = errorBodyText;
      try {
        errorDetails = JSON.stringify(JSON.parse(errorBodyText)); // Try parsing as JSON
      } catch (e) {
        console.log('Could not parse SendGrid error response as JSON.');
      }
      // Throw error to be caught by the outer catch block
      throw new Error(`SendGrid API Error: ${sendgridResponse.status} ${sendgridResponse.statusText} - ${errorDetails}`);
    } else {
      console.log('SendGrid response ok:', sendgridResponse.status, sendgridResponse.statusText);
    }

    // --- Return Success ---
    const data = { sendgrid_status: sendgridResponse.status };
    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent via SendGrid.',
      data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    // This outer catch handles errors from setup (env vars, parsing) and re-thrown errors from fetch/SendGrid response check
    console.error('Error in send-pir-notification function (catch block):', error); // Log re-enabled
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 // Return 500 Internal Server Error
    });
  }
});
