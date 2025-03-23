
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface EmailProps {
  to: string;
  subject: string;
  body: string;
  imageData?: string;
  coordinates?: GeolocationCoordinates;
}

/**
 * Sends an email using Supabase Edge Functions
 */
export const sendEmail = async (props: EmailProps): Promise<{ success: boolean; message: string }> => {
  const { to, subject, body, imageData, coordinates } = props;
  
  console.log("Sending email:", { to, subject });
  
  // Check if image data is present
  if (imageData) {
    console.log("Image data present, length:", imageData.length);
  } else {
    console.log("No image data provided");
  }
  
  // Check if Supabase is properly configured
  if (!isSupabaseConfigured()) {
    console.warn("Supabase is not configured. Email sending is in simulation mode.");
    // Simulate API call delay for development
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      message: `[SIMULATED] Email would be sent to ${to} ${imageData ? 'with image attachment' : 'without image'}`
    };
  }
  
  try {
    console.log("Preparing to call Supabase Edge Function 'send-email'");
    
    // Prepare image data for transmission
    // Remove the data URL prefix if present
    const processedImageData = imageData ? imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '') : undefined;
    
    // Call Supabase Edge Function for sending email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        body,
        imageData: processedImageData, // Send only the base64 part of the image
        imageFormat: imageData ? (imageData.includes('data:image/png') ? 'png' : 'jpeg') : undefined,
        coordinates: coordinates ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy: coordinates.accuracy
        } : undefined
      }
    });

    if (error) {
      console.error("Error calling send-email function:", error);
      return {
        success: false,
        message: error.message || "Failed to send email"
      };
    }

    console.log("Response from send-email function:", data);
    
    // Handle test mode notification
    if (data && data.testingMode) {
      return {
        success: true,
        message: `Test mode: Email sent to owner (would go to ${to} in production) ${imageData ? 'with image attachment' : ''}`
      };
    }
    
    return {
      success: true,
      message: `Email sent to ${to} ${imageData ? 'with image attachment' : ''}`
    };
  } catch (error) {
    console.error("Exception in sendEmail function:", error);
    return {
      success: false,
      message: "Failed to send email"
    };
  }
};

/**
 * Creates a formatted email body for a serve attempt
 */
export const createServeEmailBody = (
  clientName: string,
  address: string,
  notes: string,
  timestamp: Date,
  coords: GeolocationCoordinates,
  attemptNumber: number
): string => {
  const googleMapsUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  
  return `
Process Serve Attempt #${attemptNumber}

Client: ${clientName}
Address: ${address}
Date: ${timestamp.toLocaleString()}
GPS Coordinates: ${coords.latitude}, ${coords.longitude}
Location Link: ${googleMapsUrl}

Notes:
${notes}

---
This is an automated message from ServeTracker.
  `;
};
