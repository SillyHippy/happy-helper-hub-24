
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface EmailProps {
  to: string | string[];  // Updated to accept an array of emails
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
    console.error("Supabase is not configured. Email sending will fail.");
    return {
      success: false,
      message: "Supabase is not configured. Cannot send email."
    };
  }
  
  try {
    console.log("Preparing to call Supabase Edge Function 'send-email'");
    
    // Handle array of emails or single email
    const recipients = Array.isArray(to) ? to : [to];
    
    // Validate email format for all recipients
    for (const email of recipients) {
      if (!email || !email.includes('@')) {
        return {
          success: false,
          message: `Invalid recipient email address: ${email}`
        };
      }
    }
    
    // Prepare image data for transmission
    // Remove the data URL prefix if present
    const processedImageData = imageData ? imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '') : undefined;
    
    // For each recipient, send an email
    const results = await Promise.all(recipients.map(async (recipient) => {
      // Call Supabase Edge Function for sending email
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipient,
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
        console.error(`Error calling send-email function for ${recipient}:`, error);
        return {
          recipient,
          success: false,
          message: error.message || "Failed to send email"
        };
      }

      console.log(`Response from send-email function for ${recipient}:`, data);
      return {
        recipient,
        success: true,
        message: data.message || `Email sent to ${recipient}${imageData ? ' with image attachment' : ''}`
      };
    }));
    
    // Check if any emails failed
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      return {
        success: false,
        message: `Failed to send email to ${failures.length} recipient(s): ${failures.map(f => f.recipient).join(', ')}`
      };
    }
    
    return {
      success: true,
      message: `Email sent to ${recipients.length} recipient(s)`
    };
  } catch (error) {
    console.error("Exception in sendEmail function:", error);
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
