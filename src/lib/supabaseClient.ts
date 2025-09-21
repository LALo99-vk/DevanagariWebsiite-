import { createClient } from "@supabase/supabase-js";

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Debug: Log Supabase config
console.log("Supabase Config:", {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
});
