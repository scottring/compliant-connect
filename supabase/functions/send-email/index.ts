import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail"; // Use npm specifier for Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Import CORS headers
// Initialize Supabase client (needed to fetch company details)
// Use environment variables for Supabase URL and Anon Key within the function
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
// Consider throwing an error or handling appropriately
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Helper to fetch company details
async function getCompanyDetails(companyId) {
  if (!companyId) return null;
  const { data, error } = await supabase.from('companies').select('name, contact_email').eq('id', companyId).single();
  if (error) {
    console.error(`Error fetching company details for ${companyId}:`, error);
    return null;
  }
  return data;
}
// Helper to fetch product name
async function getProductName(productId, suggestedName) {
  if (suggestedName) return suggestedName;
  if (!productId) return 'Unknown Product';
  const { data, error } = await supabase.from('products').select('name').eq('id', productId).single();
  if (error || !data) {
    console.error(`Error fetching product name for ${productId}:`, error);
    return 'Unknown Product';
  }
  return data.name;
}
serve(async (req)=>{
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // 1. Validate request (e.g., check method, headers if needed)
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
  }
  let payload; // Use 'any' for flexibility or define a more specific union type
  try {
    payload = await req.json();
    console.log("Received payload:", payload);
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return new Response("Bad Request: Invalid JSON", {
      status: 400,
      headers: corsHeaders
    });
  }
  // 2. Retrieve SendGrid API Key from Secrets
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!sendgridApiKey) {
    console.error("SENDGRID_API_KEY secret not set.");
    return new Response("Internal Server Error: Email configuration missing", {
      status: 500,
      headers: corsHeaders
    });
  }
  sgMail.setApiKey(sendgridApiKey);
  // 3. Get Sender Email (Set this as an environment variable or hardcode carefully)
  const senderEmail = Deno.env.get("SENDER_EMAIL") || "notifications@yourverifieddomain.com"; // Replace with your verified sender
  // 4. Process based on payload type
  try {
    let msg = null;
    const appUrl = Deno.env.get("SITE_URL") || "http://localhost:8080"; // Get base URL
    console.log("Processing payload type:", payload.type);
    console.log("SITE_URL from environment:", appUrl);
    
    // --- Handle PIR Status Updates (Triggered by Webhook or Frontend) ---
    if (payload.type === 'PIR_STATUS_UPDATE') {
      // Ensure record exists in payload
      if (!payload.record) throw new Error("Missing 'record' field for PIR_STATUS_UPDATE");
      const { record, old_record } = payload; // old_record might be null if triggered from frontend
      const newStatus = record.status;
      const oldStatus = old_record?.status;
      
      console.log(`Processing PIR status update from ${oldStatus || 'unknown'} to ${newStatus}`);
      
      const productName = await getProductName(record.product_id, record.suggested_product_name);
      const customerDetails = await getCompanyDetails(record.customer_id);
      const supplierDetails = await getCompanyDetails(record.supplier_company_id);
      const customerName = customerDetails?.name ?? 'Your Customer';
      const supplierName = supplierDetails?.name ?? 'Your Supplier';
      const supplierEmail = supplierDetails?.contact_email;
      const customerEmail = customerDetails?.contact_email;
      const pirId = record.id;
      const reviewLink = `${appUrl}/customer-review/${pirId}`;
      const responseLink = `${appUrl}/supplier-response-form/${pirId}`;
      // Construct email based on new status
      switch(newStatus){
        case 'draft':
          if (supplierEmail) {
            msg = {
              to: supplierEmail,
              from: senderEmail,
              subject: `New Product Information Request from ${customerName}`,
              html: `<p>Hello ${supplierName},</p><p>You have received a new Product Information Request from <strong>${customerName}</strong> regarding the product: <strong>${productName}</strong>.</p><p>Please click the link below to view the request and submit your response:</p><p><a href="${responseLink}">${responseLink}</a></p><p>Thank you,<br/>CompliantConnect</p>`
            };
          } else {
            console.warn(`No supplier email found for PIR ${pirId}`);
          }
          break;
        case 'submitted':
          if (customerEmail) {
            msg = {
              to: customerEmail,
              from: senderEmail,
              subject: `PIR Response Submitted by ${supplierName} for ${productName}`,
              html: `<p>Hello ${customerName},</p><p><strong>${supplierName}</strong> has submitted their response for the Product Information Request regarding <strong>${productName}</strong>.</p><p>Please click the link below to review their submission:</p><p><a href="${reviewLink}">${reviewLink}</a></p><p>Thank you,<br/>CompliantConnect</p>`
            };
          } else {
            console.warn(`No customer email found for PIR ${pirId}`);
          }
          break;
        case 'in_review':
          if (supplierEmail) {
            msg = {
              to: supplierEmail,
              from: senderEmail,
              subject: `Your PIR Response for ${productName} is Being Reviewed`,
              html: `<p>Hello ${supplierName},</p><p>Your response for the Product Information Request regarding <strong>${productName}</strong> is currently being reviewed by <strong>${customerName}</strong>.</p><p>You will receive another notification when the review is complete.</p><p>Thank you,<br/>CompliantConnect</p>`
            };
          } else {
            console.warn(`No supplier email found for PIR ${pirId}`);
          }
          break;
        case 'flagged':
          if (supplierEmail) {
            msg = {
              to: supplierEmail,
              from: senderEmail,
              subject: `PIR Response Requires Revision - Request from ${customerName}`,
              html: `<p>Hello ${supplierName},</p><p>Your response for the Product Information Request regarding <strong>${productName}</strong> has been reviewed by <strong>${customerName}</strong>, and some items require revision.</p><p>Please click the link below to view the feedback and update your response:</p><p><a href="${responseLink}">${responseLink}</a></p><p>Thank you,<br/>CompliantConnect</p>`
            };
          } else {
            console.warn(`No supplier email found for PIR ${pirId}`);
          }
          break;
        case 'approved':
          if (supplierEmail) {
            msg = {
              to: supplierEmail,
              from: senderEmail,
              subject: `PIR Response Approved by ${customerName} for ${productName}`,
              html: `<p>Hello ${supplierName},</p><p>Your response for the Product Information Request regarding <strong>${productName}</strong> has been reviewed and approved by <strong>${customerName}</strong>.</p><p>No further action is required at this time.</p><p>Thank you,<br/>CompliantConnect</p>`
            };
          } else {
            console.warn(`No supplier email found for PIR ${pirId}`);
          }
          break;
        // Add cases for 'rejected', 'in_review' if needed
        default:
          console.log(`No email notification configured for status update to: ${newStatus}`);
      }
    } else if (payload.type === 'PIR_RESPONSE_SUBMITTED') {
      console.log("Handling PIR_RESPONSE_SUBMITTED type");
      // Handle direct response submission notifications (when supplier submits a response)
      if (!payload.record) throw new Error("Missing 'record' field for PIR_RESPONSE_SUBMITTED");
      const record = payload.record;
      
      console.log("PIR record:", JSON.stringify(record));
      
      // If we have direct access to nested customer data (from a join), use it
      // Otherwise, fetch it separately
      let customerDetails;
      if (record.customer?.name && record.customer?.contact_email) {
        console.log("Using customer data from nested join");
        customerDetails = record.customer;
      } else {
        console.log("Fetching customer details from customer_id");
        customerDetails = await getCompanyDetails(record.customer_id);
      }
      
      // Similar for supplier data
      let supplierDetails;
      if (record.supplier?.name) {
        console.log("Using supplier data from nested join");
        supplierDetails = record.supplier;
      } else {
        console.log("Fetching supplier details from supplier_company_id");
        supplierDetails = await getCompanyDetails(record.supplier_company_id);
      }
      
      // Similar for product name
      let productName;
      if (record.products?.name) {
        console.log("Using product name from nested join");
        productName = record.products.name;
      } else {
        console.log("Fetching product name or using suggested name");
        productName = await getProductName(record.product_id, record.suggested_product_name);
      }
      
      console.log("Product name:", productName);
      console.log("Customer details:", JSON.stringify(customerDetails));
      console.log("Supplier details:", JSON.stringify(supplierDetails));
      
      const customerName = customerDetails?.name ?? 'Your Customer';
      const supplierName = supplierDetails?.name ?? 'Your Supplier';
      const customerEmail = customerDetails?.contact_email;
      const pirId = record.id;
      const reviewLink = `${appUrl}/customer-review/${pirId}`;
      
      if (customerEmail) {
        console.log(`Sending response submission notification to customer: ${customerEmail}`);
        msg = {
          to: customerEmail,
          from: senderEmail,
          subject: `PIR Response Submitted by ${supplierName} for ${productName}`,
          html: `<p>Hello ${customerName},</p><p><strong>${supplierName}</strong> has submitted their response for the Product Information Request regarding <strong>${productName}</strong>.</p><p>Please click the link below to review their submission:</p><p><a href="${reviewLink}">${reviewLink}</a></p><p>Thank you,<br/>CompliantConnect</p>`
        };
      } else {
        console.warn(`No customer email found for PIR ${pirId}`);
      }
    } else if (payload.type === 'SUPPLIER_INVITATION') {
      // Ensure data field exists
      if (!payload.data) throw new Error("Missing 'data' field for SUPPLIER_INVITATION");
      const { invite_email, inviter_name, inviter_company_name } = payload.data;
      const signupLink = `${appUrl}/auth`; // Adjust as needed
      msg = {
        to: invite_email,
        from: senderEmail,
        subject: `Invitation to join ${inviter_company_name} on CompliantConnect`,
        html: `<p>Hello,</p><p><strong>${inviter_name}</strong> from <strong>${inviter_company_name}</strong> has invited you to collaborate on product compliance information using CompliantConnect.</p><p>Please click the link below to sign up or log in:</p><p><a href="${signupLink}">${signupLink}</a></p><p>Thank you,<br/>The CompliantConnect Team</p>`
      };
    } else if (payload.type === 'REVIEW_COMPLETED') {
      // Handle customer review completion notification (when a customer completes their review)
      console.log("Handling REVIEW_COMPLETED type");
      if (!payload.record) throw new Error("Missing 'record' field for REVIEW_COMPLETED");
      const record = payload.record;
      
      console.log("PIR record:", JSON.stringify(record));
      
      // If we have direct access to nested data, use it
      // Otherwise, fetch it separately
      let customerDetails;
      if (record.customer?.name) {
        console.log("Using customer data from nested join");
        customerDetails = record.customer;
      } else {
        console.log("Fetching customer details from customer_id");
        customerDetails = await getCompanyDetails(record.customer_id);
      }
      
      let supplierDetails;
      if (record.supplier?.name) {
        console.log("Using supplier data from nested join");
        supplierDetails = record.supplier;
      } else {
        console.log("Fetching supplier details from supplier_company_id");
        supplierDetails = await getCompanyDetails(record.supplier_company_id);
      }
      
      let productName;
      if (record.products?.name) {
        console.log("Using product name from nested join");
        productName = record.products.name;
      } else {
        console.log("Fetching product name or using suggested name");
        productName = await getProductName(record.product_id, record.suggested_product_name);
      }
      
      console.log("Product name:", productName);
      console.log("Customer details:", JSON.stringify(customerDetails));
      console.log("Supplier details:", JSON.stringify(supplierDetails));
      
      const customerName = customerDetails?.name ?? 'Your Customer';
      const supplierName = supplierDetails?.name ?? 'Your Supplier';
      const supplierEmail = supplierDetails?.contact_email;
      const pirId = record.id;
      const pirStatus = record.status;
      const responseLink = `${appUrl}/supplier-response-form/${pirId}`;
      
      if (supplierEmail) {
        console.log(`Sending review completion notification to supplier: ${supplierEmail}`);
        
        let emailSubject = '';
        let emailContent = '';
        
        if (pirStatus === 'approved') {
          emailSubject = `Your PIR Response for ${productName} has been Approved`;
          emailContent = `<p>Hello ${supplierName},</p><p>Your response for the Product Information Request regarding <strong>${productName}</strong> has been reviewed and approved by <strong>${customerName}</strong>.</p><p>No further action is required at this time.</p><p>Thank you,<br/>CompliantConnect</p>`;
        } else if (pirStatus === 'flagged') {
          emailSubject = `Your PIR Response for ${productName} Needs Revision`;
          emailContent = `<p>Hello ${supplierName},</p><p>Your response for the Product Information Request regarding <strong>${productName}</strong> has been reviewed by <strong>${customerName}</strong>, and some items require revision.</p><p>Please click the link below to view the feedback and update your response:</p><p><a href="${responseLink}">${responseLink}</a></p><p>Thank you,<br/>CompliantConnect</p>`;
        } else if (pirStatus === 'submitted') {
          emailSubject = `Your PIR Response for ${productName} is Being Reviewed`;
          emailContent = `<p>Hello ${supplierName},</p><p>Your response for the Product Information Request regarding <strong>${productName}</strong> is currently being reviewed by <strong>${customerName}</strong>.</p><p>You will receive another notification when the review is complete.</p><p>Thank you,<br/>CompliantConnect</p>`;
        } else {
          emailSubject = `Your PIR Response for ${productName} has been Reviewed`;
          emailContent = `<p>Hello ${supplierName},</p><p>Your response for the Product Information Request regarding <strong>${productName}</strong> has been reviewed by <strong>${customerName}</strong>.</p><p>Please click the link below to view the review status:</p><p><a href="${responseLink}">${responseLink}</a></p><p>Thank you,<br/>CompliantConnect</p>`;
        }
        
        msg = {
          to: supplierEmail,
          from: senderEmail,
          subject: emailSubject,
          html: emailContent
        };
      } else {
        console.warn(`No supplier email found for PIR ${pirId}`);
      }
    } else {
      console.warn("Unknown payload type received:", payload.type);
    }
    // 5. Send email if message object was created
    if (msg) {
      console.log("Sending email:", JSON.stringify(msg, null, 2));
      await sgMail.send(msg);
      console.log("Email sent successfully.");
      return new Response(JSON.stringify({
        success: true,
        message: "Email sent successfully"
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      console.log("No email message generated for this payload.");
      return new Response(JSON.stringify({
        success: false,
        message: "No email generated for this payload type or condition."
      }), {
        status: 200,
        headers: corsHeaders
      }); // Return 200 even if no email sent, but indicate why
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({
      error: `Internal Server Error: ${error.message}`
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
