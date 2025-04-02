import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import sgMail from "npm:@sendgrid/mail"; // Use npm specifier for Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define expected payload structures
interface BasePayload {
  type: 'PIR_STATUS_UPDATE' | 'SUPPLIER_INVITATION';
}

interface PirStatusUpdatePayload extends BasePayload {
  type: 'PIR_STATUS_UPDATE';
  record: { // Structure from the database trigger payload
    id: string;
    status: string; // The new status
    supplier_company_id: string;
    customer_id: string;
    product_id?: string;
    suggested_product_name?: string;
  };
  old_record?: { // Optional old record for comparison
     status?: string;
  };
}

interface SupplierInvitationPayload extends BasePayload {
  type: 'SUPPLIER_INVITATION';
  // Define fields needed for invitation email
  invite_email: string;
  inviter_name: string;
  inviter_company_name: string;
  // Add signup link or other relevant info if needed
  // signup_link?: string; 
}

type EmailPayload = PirStatusUpdatePayload | SupplierInvitationPayload;

// Initialize Supabase client (needed to fetch company details)
// Use environment variables for Supabase URL and Anon Key within the function
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
    // Consider throwing an error or handling appropriately
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);


// Helper to fetch company details
async function getCompanyDetails(companyId: string): Promise<{ name: string; contact_email: string | null } | null> {
    const { data, error } = await supabase
        .from('companies')
        .select('name, contact_email')
        .eq('id', companyId)
        .single();

    if (error) {
        console.error(`Error fetching company details for ${companyId}:`, error);
        return null;
    }
    return data;
}

// Helper to fetch product name
async function getProductName(productId: string | null | undefined, suggestedName: string | null | undefined): Promise<string> {
    if (suggestedName) return suggestedName;
    if (!productId) return 'Unknown Product';

    const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

    if (error || !data) {
        console.error(`Error fetching product name for ${productId}:`, error);
        return 'Unknown Product';
    }
    return data.name;
}


serve(async (req) => {
  // 1. Validate request (e.g., check method, headers if needed)
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: EmailPayload;
  try {
    payload = await req.json();
    console.log("Received payload:", payload);
  } catch (e) {
    console.error("Failed to parse request body:", e);
    return new Response("Bad Request: Invalid JSON", { status: 400 });
  }

  // 2. Retrieve SendGrid API Key from Secrets
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!sendgridApiKey) {
    console.error("SENDGRID_API_KEY secret not set.");
    return new Response("Internal Server Error: Email configuration missing", { status: 500 });
  }
  sgMail.setApiKey(sendgridApiKey);

  // 3. Get Sender Email (Set this as an environment variable or hardcode carefully)
  const senderEmail = Deno.env.get("SENDER_EMAIL") || "noreply@yourdomain.com"; // Replace with your verified sender

  // 4. Process based on payload type
  try {
    let msg: sgMail.MailDataRequired | null = null;

    if (payload.type === 'PIR_STATUS_UPDATE') {
      const { record, old_record } = payload;
      const newStatus = record.status;
      const oldStatus = old_record?.status;

      // Avoid sending email if status hasn't changed relevantly
      if (newStatus === oldStatus) {
          console.log("Status unchanged, skipping email.");
          return new Response("OK: Status unchanged", { status: 200 });
      }

      const productName = await getProductName(record.product_id, record.suggested_product_name);
      const customerDetails = await getCompanyDetails(record.customer_id);
      const supplierDetails = await getCompanyDetails(record.supplier_company_id);

      const customerName = customerDetails?.name ?? 'Your Customer';
      const supplierName = supplierDetails?.name ?? 'Your Supplier';
      const supplierEmail = supplierDetails?.contact_email;
      const customerEmail = customerDetails?.contact_email; // Assuming customer contact email is needed

      // Construct email based on new status
      switch (newStatus) {
        case 'pending_supplier':
          if (supplierEmail) {
            msg = {
              to: supplierEmail,
              from: senderEmail,
              subject: `Action Required: Product Information Request for ${productName}`,
              text: `Hello ${supplierName},\n\n${customerName} has requested product information for "${productName}". Please log in to provide the details.\n\nPIR ID: ${record.id}`,
              // html: "<strong>HTML version here</strong>", // Optional HTML content
            };
          } else { console.warn(`No supplier email found for PIR ${record.id}`); }
          break;
        case 'pending_review':
           if (customerEmail) {
             msg = {
               to: customerEmail,
               from: senderEmail,
               subject: `Response Submitted: PIR for ${productName} from ${supplierName}`,
               text: `Hello ${customerName},\n\n${supplierName} has submitted responses for the Product Information Request regarding "${productName}". Please log in to review.\n\nPIR ID: ${record.id}`,
             };
           } else { console.warn(`No customer email found for PIR ${record.id}`); }
           break;
        case 'accepted':
           if (supplierEmail) {
             msg = {
               to: supplierEmail,
               from: senderEmail,
               subject: `PIR Accepted: ${productName}`,
               text: `Hello ${supplierName},\n\nThe Product Information Request for "${productName}" submitted to ${customerName} has been accepted.\n\nPIR ID: ${record.id}`,
             };
           } else { console.warn(`No supplier email found for PIR ${record.id}`); }
           break;
        case 'rejected':
           if (supplierEmail) {
             msg = {
               to: supplierEmail,
               from: senderEmail,
               subject: `PIR Rejected: ${productName}`,
               text: `Hello ${supplierName},\n\nThe Product Information Request for "${productName}" submitted to ${customerName} has been rejected. Please check the platform for details.\n\nPIR ID: ${record.id}`,
             };
           } else { console.warn(`No supplier email found for PIR ${record.id}`); }
           break;
        // Add cases for other statuses if needed (e.g., flagged?)
        default:
          console.log(`No email notification configured for status: ${newStatus}`);
      }

    } else if (payload.type === 'SUPPLIER_INVITATION') {
      const { invite_email, inviter_name, inviter_company_name } = payload;
      msg = {
        to: invite_email,
        from: senderEmail,
        subject: `Invitation to join ${inviter_company_name} on Compliance Platform`,
        text: `Hello,\n\n${inviter_name} from ${inviter_company_name} has invited you to collaborate on product compliance information. Please sign up or log in to get started.\n\n[Link to Platform/Signup - TODO]`, // Add actual link
        // html: "<strong>HTML version here</strong>",
      };
    }

    // 5. Send email if message object was created
    if (msg) {
      console.log("Sending email:", JSON.stringify(msg, null, 2));
      await sgMail.send(msg);
      console.log("Email sent successfully.");
      return new Response("Email sent successfully", { status: 200 });
    } else {
      console.log("No email message generated for this payload.");
      return new Response("OK: No action taken", { status: 200 });
    }

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
});
