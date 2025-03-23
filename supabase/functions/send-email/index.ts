
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Initialize Resend with the API key
const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log("Resend API Key configured:", resendApiKey ? "YES (length: " + resendApiKey.length + ")" : "NO");
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
    const { to, subject, body, imageData, imageFormat, coordinates } = await req.json();
    
    console.log(`Processing email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Has image: ${!!imageData}`);
    console.log(`Has coordinates: ${!!coordinates}`);

    // Prepare attachments if image data is present
    const attachments = [];
    if (imageData) {
      console.log(`Image format: ${imageFormat || 'jpeg'}`);
      console.log(`Image data length: ${imageData.length}`);
      
      // Create a Buffer from the base64 string for the attachment
      attachments.push({
        filename: `serve-attempt-${new Date().toISOString()}.${imageFormat || 'jpeg'}`,
        content: imageData,
      });
    }

    // Create location link if coordinates are provided
    let emailBody = body;
    if (coordinates) {
      const googleMapsUrl = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
      emailBody += `\n\nLocation: ${googleMapsUrl}`;
    }

    console.log("Attempting to send email with Resend...");
    
    // Get the verified domain from environment variables
    const fromDomain = Deno.env.get("RESEND_VERIFIED_DOMAIN");
    if (!fromDomain) {
      throw new Error("RESEND_VERIFIED_DOMAIN is not set. Please set this value in your Supabase Edge Function secrets.");
    }
    
    console.log(`Using verified domain: ${fromDomain}`);
    
    // Validate email format
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid recipient email address: ${to}`);
    }
    
    // Construct the from address with the verified domain
    const fromAddress = `ServeTracker <no-reply@${fromDomain}>`;
    console.log(`Using from address: ${fromAddress}`);
    
    // Send the email using Resend API with the verified domain as the from address
    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      text: emailBody,
      attachments: attachments,
    });

    console.log("Email send attempt complete:", emailResponse);
    if (emailResponse.error) {
      console.error("Resend API returned error:", emailResponse.error);
      throw new Error(emailResponse.error.message || "Unknown error from Resend API");
    }

    // Return a successful response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${to}${imageData ? ' with image attachment' : ''}`,
        id: emailResponse.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing email request:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
