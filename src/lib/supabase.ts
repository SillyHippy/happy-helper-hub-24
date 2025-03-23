
import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for the new Supabase project
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
    }
  }
);

// Enable realtime subscriptions for serve_attempts table with improved error handling
export const setupRealtimeSubscription = () => {
  try {
    const channel = supabase
      .channel('schema-db-changes')
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

    return () => {
      supabase.removeChannel(channel);
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

// Improve the sync function to use simple fetch without any complex merging
export const syncSupabaseServesToLocal = async () => {
  try {
    console.log("Syncing serve attempts from Supabase to local storage");
    
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('serve_attempts')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error("Error fetching serve attempts from Supabase:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log("No serve attempts found in Supabase");
      // Important: Clear local storage when Supabase has no data
      localStorage.setItem("serve-tracker-serves", JSON.stringify([]));
      return [];
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
    return [];
  }
};

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};
