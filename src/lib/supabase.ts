
import { createClient } from '@supabase/supabase-js';

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
    }
  }
);

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};
