// Test if Supabase client is working at all
export const testSupabaseClient = () => {
  console.log("🔍 Testing Supabase Client");
  console.log("==========================");

  try {
    // Import supabase client
    const { supabase } = require("../lib/supabaseClient");

    console.log("✅ Supabase client imported successfully");
    console.log("   URL:", supabase.supabaseUrl);
    console.log("   Key exists:", !!supabase.supabaseKey);

    // Test if we can create a simple query object
    const query = supabase.from("test").select("*");
    console.log("✅ Query object created:", typeof query);

    // Test if we can call auth methods
    const auth = supabase.auth;
    console.log("✅ Auth object exists:", typeof auth);

    console.log("🎉 Supabase client appears to be working!");
    return true;
  } catch (error) {
    console.error("❌ Supabase client test failed:", error);
    return false;
  }
};

// Make it available globally
(window as any).testSupabaseClient = testSupabaseClient;
