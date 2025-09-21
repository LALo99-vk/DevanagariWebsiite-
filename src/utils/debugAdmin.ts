import { supabase } from "../lib/supabaseClient";

// Simple debug function to test admin connection manually
export const debugAdmin = async () => {
  console.log("🔍 Debug Admin Connection");
  console.log("========================");

  // Test 0: Check Supabase configuration
  console.log("0. Checking Supabase configuration...");
  console.log("   URL:", supabase.supabaseUrl);
  console.log("   Has Key:", !!supabase.supabaseKey);

  // Test 1: Check current user with timeout
  console.log("\n1. Checking current user...");
  try {
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Auth timeout")), 3000)
    );

    const result = (await Promise.race([authPromise, timeoutPromise])) as any;
    const {
      data: { user },
      error: authError,
    } = result;

    if (authError) {
      console.error("❌ Auth error:", authError);
      return;
    }

    if (!user) {
      console.log("⚠️ No user logged in");
      return;
    }

    console.log("✅ User:", user.email);
    console.log("   ID:", user.id);

    // Test 2: Check admin status by email
    console.log("\n2. Checking admin status...");
    const isAdmin = user.email === "adityapiyush71@gmail.com";
    console.log("   Is admin (by email):", isAdmin);

    // Test 3: Test database connection with simple query
    console.log("\n3. Testing database connection...");
    try {
      const dbPromise = supabase.from("products").select("count").limit(1);

      const dbTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 3000)
      );

      const { data, error } = (await Promise.race([
        dbPromise,
        dbTimeoutPromise,
      ])) as any;

      if (error) {
        console.warn("⚠️ Database error:", error.message);
        console.log("   This might be why admin panel is not working");
      } else {
        console.log("✅ Database connection working");
      }
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError);
    }

    // Test 4: Check if user exists in users table
    console.log("\n4. Checking user in database...");
    try {
      const userPromise = supabase
        .from("users")
        .select("is_admin, role, full_name")
        .eq("id", user.id)
        .single();

      const userTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("User DB timeout")), 3000)
      );

      const { data: userData, error: userError } = (await Promise.race([
        userPromise,
        userTimeoutPromise,
      ])) as any;

      if (userError) {
        console.warn("⚠️ User not in database:", userError.message);
        console.log("   This is expected if database setup is incomplete");
      } else {
        console.log("✅ User found in database:", userData);
      }
    } catch (userDbError) {
      console.error("❌ User database query failed:", userDbError);
    }

    console.log("\n🎉 Debug complete!");
    console.log(
      "If you see database errors, the admin panel will use fallback mode."
    );
  } catch (error) {
    console.error("❌ Debug failed:", error);
    console.log("This suggests a fundamental issue with Supabase connection");
  }
};

// Simple sync debug function
export const debugBasic = () => {
  console.log("🔍 Basic Debug Info");
  console.log("===================");
  console.log("Supabase URL:", supabase.supabaseUrl);
  console.log("Has Supabase Key:", !!supabase.supabaseKey);
  console.log("Current URL:", window.location.href);
  console.log("User Agent:", navigator.userAgent);

  // Check if we're in the right environment
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    console.log("✅ Running on localhost");
  } else {
    console.log("⚠️ Not running on localhost:", window.location.hostname);
  }
};

// Make it available globally
(window as any).debugAdmin = debugAdmin;
(window as any).debugBasic = debugBasic;
