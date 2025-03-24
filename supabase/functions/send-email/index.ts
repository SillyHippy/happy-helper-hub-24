
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Initialize Resend with the API key
const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log("Resend API Key configured:", resendApiKey ? "YES (length: " + resendApiKey.length + ")" : "NO");

if (!resendApiKey) {
  console.error("ERROR: No Resend API key found in environment variables");
}

const resend = new Resend(resendApiKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Email request received");
    
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    if (!requestBody || typeof requestBody !== 'object') {
      console.error("Invalid request body format");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request body format" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const { to, subject, body, imageData, imageFormat } = requestBody;
    
    if (!to) {
      console.error("Missing recipient email");
      return new Response(
        JSON.stringify({ success: false, error: "Missing recipient email" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Ensure 'to' is handled as a string, not an array
    const recipient = typeof to === 'string' ? to : 
                      (Array.isArray(to) && to.length > 0) ? to[0] : null;
    
    if (!recipient) {
      console.error("Invalid recipient email format:", to);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid recipient email format" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log("Sending email to:", recipient);
    
    const attachments = [];
    if (imageData) {
      console.log(`Adding image attachment (${imageFormat})`);
      attachments.push({ filename: `image.${imageFormat}`, content: imageData, encoding: "base64" });
    }
    
    // Use the verified domain in the from field
    const emailData = {
      from: "ServeTracker <notifications@justlegalsolutions.tech>",
      to: recipient, // Use a single string recipient
      subject: subject,
      html: body,
    };
    
    if (attachments.length > 0) {
      emailData.attachments = attachments;
    }
    
    console.log("Email data prepared:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: attachments.length > 0
    });
    
    const emailResponse = await resend.emails.send(emailData);
    
    console.log("Email sent successfully:", emailResponse);
    return new Response(JSON.stringify({ success: true, response: emailResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal Server Error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
