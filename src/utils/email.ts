
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
  console.log("Email body:", body);
  console.log("Email lengths - subject:", subject?.length, "body:", body?.length);
  
  // Check if image data is present
  if (imageData) {
    console.log("Image data present, length:", imageData.length);
  } else {
    console.log("No image data provided");
  }
  
  // Check if Supabase is properly configured
  if (!isSupabaseConfigured()) {
    console.error("Supabase is not configured. Email sending will fail.");
    return {
      success: false,
      message: "Supabase is not configured. Cannot send email."
    };
  }
  
  try {
    console.log("Preparing to call Supabase Edge Function 'send-email'");
    
    // Validate email format
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      console.error("Invalid recipient email address", to);
      return {
        success: false,
        message: `Invalid recipient email address: ${to}`
      };
    }
    
    // Prepare image data for transmission
    // Remove the data URL prefix if present
    const processedImageData = imageData ? imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '') : undefined;
    
    console.log(`Attempting to send email to: ${to}`);
    
    // Call Supabase Edge Function for sending email with detailed logging
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: to, // Pass as a string, not an array
        subject,
        body,
        imageData: processedImageData,
        imageFormat: imageData ? (imageData.includes('data:image/png') ? 'png' : 'jpeg') : undefined,
        coordinates: coordinates ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy: coordinates.accuracy
        } : undefined
      }
    });

    console.log("Response from edge function:", { data, error });

    if (error) {
      console.error(`Error calling send-email function for ${to}:`, error);
      return {
        success: false,
        message: error.message || "Failed to send email"
      };
    }

    console.log(`Response from send-email function for ${to}:`, data);
    return {
      success: true,
      message: data?.message || `Email sent to ${to}${imageData ? ' with image attachment' : ''}`
    };
  } catch (error) {
    console.error(`Exception in email sending to ${to}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email"
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
  attemptNumber: number,
  caseNumber?: string
): string => {
  const googleMapsUrl = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  
  return `
Process Serve Attempt #${attemptNumber}

Client: ${clientName}
Address: ${address}
${caseNumber ? `Case Number: ${caseNumber}\n` : ''}
Date: ${timestamp.toLocaleString()}
GPS Coordinates: ${coords.latitude}, ${coords.longitude}
Location Link: ${googleMapsUrl}

Notes:
${notes}

---
This is an automated message from ServeTracker.
  `;
};

/**
 * Creates a notification email for serve attempt deletion
 */
export const createDeleteNotificationEmail = (
  clientName: string,
  caseNumber: string,
  serveDate: Date,
  deleteReason?: string
): string => {
  return `
Serve Attempt Deleted

Client: ${clientName}
Case: ${caseNumber}
Original Serve Date: ${serveDate.toLocaleString()}
${deleteReason ? `\nReason for deletion: ${deleteReason}\n` : ''}

This serve attempt has been permanently removed from the system.

---
This is an automated message from ServeTracker.
  `;
};

/**
 * Creates a notification email for serve attempt updates
 */
export const createUpdateNotificationEmail = (
  clientName: string,
  caseNumber: string,
  serveDate: Date,
  oldStatus: string,
  newStatus: string,
  notes?: string
): string => {
  return `
Serve Attempt Updated

Client: ${clientName}
Case: ${caseNumber}
Serve Date: ${serveDate.toLocaleString()}
Status: Changed from "${oldStatus}" to "${newStatus}"
${notes ? `\nNotes: ${notes}\n` : ''}

---
This is an automated message from ServeTracker.
  `;
};
