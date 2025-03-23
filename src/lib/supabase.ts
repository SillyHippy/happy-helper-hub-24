
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Get environment variables with fallbacks and validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sgvshurptmccqixrutpc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndnNodXJwdG1jY3FpeHJ1dHBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2ODU2MjUsImV4cCI6MjA1ODI2MTYyNX0.Tfws4p00o4_tJscyO22eXCf2jseyh1_azLKObvom6Xk';

// Check if environment variables are available and log a more specific message
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not found. Using fallback configuration. For production, please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Create a Supabase client with the actual Supabase project details as fallback
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

// Enable realtime subscription to serve_attempts table
export const setupRealtimeSubscription = () => {
  const channel = supabase.channel('serve-attempts-changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'serve_attempts' 
    }, (payload) => {
      console.log('Realtime update received:', payload);
      
      // Display toast notification when new serve attempt is created
      if (payload.eventType === 'INSERT') {
        toast('New serve attempt synced', {
          description: "A new serve attempt has been synced from another device."
        });
      }
    })
    .subscribe((status) => {
      console.log('Realtime subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to serve_attempts table');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to serve_attempts table');
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Helper function to sync local serve attempts to Supabase
export const syncLocalServesToSupabase = async () => {
  try {
    const savedServes = localStorage.getItem("serve-tracker-serves");
    if (!savedServes) return;
    
    const serveAttempts = JSON.parse(savedServes);
    console.log(`Attempting to sync ${serveAttempts.length} local serve attempts to Supabase`);
    
    // For each serve attempt in local storage, check if it exists in Supabase
    // If not, insert it
    for (const serve of serveAttempts) {
      const { data, error } = await supabase
        .from('serve_attempts')
        .select('id')
        .eq('id', serve.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking serve attempt:", error);
        continue;
      }
      
      // If serve doesn't exist in Supabase, insert it
      if (!data) {
        const { error: insertError } = await supabase
          .from('serve_attempts')
          .insert({
            id: serve.id,
            client_id: serve.clientId,
            case_number: serve.caseNumber,
            status: serve.status,
            notes: serve.notes,
            coordinates: serve.coordinates,
            timestamp: serve.timestamp,
            image_data: serve.imageData,
            attempt_number: serve.attemptNumber
          });
        
        if (insertError) {
          console.error("Error inserting serve attempt:", insertError);
        } else {
          console.log(`Successfully synced serve attempt ${serve.id} to Supabase`);
        }
      }
    }
    
    console.log("Local to Supabase sync complete");
  } catch (error) {
    console.error("Error syncing local serves to Supabase:", error);
  }
};

// Helper function to sync Supabase serve attempts to local storage
export const syncSupabaseServesToLocal = async () => {
  try {
    // First get existing local serves
    const savedServes = localStorage.getItem("serve-tracker-serves");
    const localServes = savedServes ? JSON.parse(savedServes) : [];
    const localServeIds = new Set(localServes.map(serve => serve.id));
    
    // Then fetch from Supabase
    const { data, error } = await supabase
      .from('serve_attempts')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error("Error fetching serve attempts from Supabase:", error);
      return localServes; // Return existing local serves if fetch fails
    }
    
    if (!data || data.length === 0) {
      console.log("No serve attempts found in Supabase");
      return localServes; // Return existing local serves if no data in Supabase
    }
    
    console.log(`Fetched ${data.length} serve attempts from Supabase`);
    
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
    
    // Merge Supabase serves with local serves, giving priority to newer entries
    const mergedServes = [...localServes];
    
    for (const supabaseServe of formattedSupabaseServes) {
      if (!localServeIds.has(supabaseServe.id)) {
        // This is a new serve from Supabase, add it to our local collection
        mergedServes.push(supabaseServe);
      }
    }
    
    // Sort by timestamp (newest first)
    mergedServes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Save merged data to local storage
    localStorage.setItem("serve-tracker-serves", JSON.stringify(mergedServes));
    console.log(`Successfully synced and merged ${formattedSupabaseServes.length} serve attempts from Supabase with ${localServes.length} local serves`);
    
    return mergedServes;
  } catch (error) {
    console.error("Error syncing Supabase serves to local:", error);
    const savedServes = localStorage.getItem("serve-tracker-serves");
    return savedServes ? JSON.parse(savedServes) : [];
  }
};
