
import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for the Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qdjdmicjzmpggctzjsrf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkamRtaWNqem1wZ2djdHpqc3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MTAxODIsImV4cCI6MjA1ODI4NjE4Mn0.St9w_1cd-8yr0vsL6tYQ0MgiQJeqV7-fw6TIursi0I8';

// Check if environment variables are available and log a more specific message
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not found. Using fallback configuration. For production, please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Create a Supabase client with the updated Supabase project details
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Enhanced realtime subscriptions for serve_attempts table
export const setupRealtimeSubscription = () => {
  try {
    console.log("Setting up realtime subscription for serve_attempts table");
    
    const channel = supabase
      .channel('realtime-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'serve_attempts'
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          // Force a sync whenever we get a realtime update
          syncSupabaseServesToLocal().catch(err => {
            console.error("Error syncing after realtime update:", err);
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Also subscribe to clients table changes
    const clientsChannel = supabase
      .channel('client-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        (payload) => {
          console.log('Client table update received:', payload);
          // Let the app know a client change happened
          window.dispatchEvent(new CustomEvent('client-updated', { detail: payload }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(clientsChannel);
    };
  } catch (error) {
    console.error('Error setting up realtime subscription:', error);
    return () => {
      // No-op fallback function
      console.log('Realtime subscription cleanup called, but setup failed');
    };
  }
};

// Improved function to delete a serve attempt
export const deleteServeAttempt = async (serveId: string) => {
  try {
    console.log(`Deleting serve attempt with ID: ${serveId} from Supabase`);
    
    // Delete from Supabase
    const { error } = await supabase
      .from('serve_attempts')
      .delete()
      .eq('id', serveId);
    
    if (error) {
      console.error("Error deleting serve attempt from Supabase:", error);
      return { success: false, error: error.message };
    }
    
    console.log("Successfully deleted serve attempt from Supabase");
    
    // Update local storage
    const serveAttemptsStr = localStorage.getItem("serve-tracker-serves");
    if (serveAttemptsStr) {
      const serveAttempts = JSON.parse(serveAttemptsStr);
      const updatedServes = serveAttempts.filter((serve: any) => serve.id !== serveId);
      localStorage.setItem("serve-tracker-serves", JSON.stringify(updatedServes));
      console.log(`Updated local storage. Removed serve attempt ${serveId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error deleting serve attempt:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
};

// Disable sync from local to Supabase to prevent data reappearance
export const syncLocalServesToSupabase = async () => {
  console.log('Sync from local to Supabase is disabled');
  return;
};

// Improved sync function for more reliable cross-platform syncing
export const syncSupabaseServesToLocal = async () => {
  try {
    console.log("Syncing serve attempts from Supabase to local storage");
    
    // Fetch from Supabase with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let data = null;
    let error = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      const result = await supabase
        .from('serve_attempts')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (!result.error) {
        data = result.data;
        break;
      } else {
        error = result.error;
        if (attempts < maxAttempts) {
          console.warn(`Fetch attempt ${attempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
        }
      }
    }
    
    if (error) {
      console.error("Error fetching serve attempts from Supabase after retries:", error);
      return null;
    }
    
    if (!data) {
      console.log("No serve attempts data received from Supabase");
      return null;
    }
    
    // Convert to the format used in local storage
    const formattedSupabaseServes = data.map(serve => ({
      id: serve.id,
      clientId: serve.client_id,
      caseNumber: serve.case_number,
      status: serve.status,
      notes: serve.notes,
      coordinates: serve.coordinates,
      timestamp: serve.timestamp,
      imageData: serve.image_data,
      attemptNumber: serve.attempt_number
    }));
    
    // Store in local storage to ensure consistency
    localStorage.setItem("serve-tracker-serves", JSON.stringify(formattedSupabaseServes));
    console.log(`Synced ${formattedSupabaseServes.length} serve attempts from Supabase to local storage`);
    
    return formattedSupabaseServes;
  } catch (error) {
    console.error("Error syncing Supabase serves to local:", error);
    return null;
  }
};

// Update serve attempt function
export const updateServeAttempt = async (serve: any) => {
  try {
    console.log(`Updating serve attempt with ID: ${serve.id}`);
    
    const { error } = await supabase
      .from('serve_attempts')
      .update({
        status: serve.status,
        notes: serve.notes,
        case_number: serve.caseNumber
      })
      .eq('id', serve.id);
    
    if (error) {
      console.error("Error updating serve attempt:", error);
      return { success: false, error: error.message };
    }
    
    console.log("Successfully updated serve attempt");
    
    // Send email to client about update
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('email, name, additional_emails')
        .eq('id', serve.clientId)
        .single();
        
      if (!clientError && clientData && (clientData.email || (clientData.additional_emails && clientData.additional_emails.length > 0))) {
        // Collect all email addresses
        const emails = [];
        if (clientData.email) emails.push(clientData.email);
        if (clientData.additional_emails && Array.isArray(clientData.additional_emails)) {
          emails.push(...clientData.additional_emails.filter(Boolean));
        }
        
        if (emails.length > 0) {
          // We'll handle the email sending in the component
          console.log(`Client has ${emails.length} email(s) for notifications`);
        }
      }
    } catch (emailError) {
      console.error("Error checking for client emails:", emailError);
    }
    
    // Force a sync to ensure all clients have latest data
    await syncSupabaseServesToLocal();
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error updating serve attempt:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
};

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};
