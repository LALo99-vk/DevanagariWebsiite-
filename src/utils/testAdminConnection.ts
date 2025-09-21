import { supabase } from "../lib/supabaseClient";

// Test admin connection and functionality
export const testAdminConnection = async () => {
  console.log("🔍 Testing admin connection...");

  try {
    // Test 1: Check if we can connect to Supabase with timeout
    console.log("1. Testing Supabase connection...");

    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Auth check timeout")), 5000)
    );

    const {
      data: { user },
      error: authError,
    } = (await Promise.race([authPromise, timeoutPromise])) as any;

    if (authError) {
      console.error("❌ Auth error:", authError);
      return false;
    }

    if (!user) {
      console.log("⚠️ No user logged in");
      return false;
    }

    console.log("✅ User authenticated:", user.email);

    // Test 2: Check if user exists in users table with timeout
    console.log("2. Checking user in database...");
    try {
      const userPromise = supabase
        .from("users")
        .select("is_admin, role, full_name")
        .eq("id", user.id)
        .single();

      const userTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("User query timeout")), 3000)
      );

      const { data: userData, error: userError } = (await Promise.race([
        userPromise,
        userTimeoutPromise,
      ])) as any;

      if (userError) {
        console.warn("⚠️ User not found in database:", userError);
        console.log("This is expected if database setup is incomplete");
      } else {
        console.log("✅ User found in database:", userData);
      }
    } catch (error) {
      console.warn("⚠️ User database query failed:", error);
    }

    // Test 3: Test admin status check
    console.log("3. Testing admin status...");
    const isAdminUser = user.email === "adityapiyush71@gmail.com";
    console.log("Admin status (fallback):", isAdminUser);

    // Test 4: Test basic database queries with timeouts
    console.log("4. Testing database queries...");

    // Test products table
    try {
      const productsPromise = supabase
        .from("products")
        .select("count")
        .limit(1);

      const productsTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Products query timeout")), 3000)
      );

      const { data: products, error: productsError } = (await Promise.race([
        productsPromise,
        productsTimeoutPromise,
      ])) as any;

      if (productsError) {
        console.warn("⚠️ Products table error:", productsError);
      } else {
        console.log("✅ Products table accessible");
      }
    } catch (error) {
      console.warn("⚠️ Products table query failed:", error);
    }

    // Test orders table
    try {
      const ordersPromise = supabase.from("orders").select("count").limit(1);

      const ordersTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Orders query timeout")), 3000)
      );

      const { data: orders, error: ordersError } = (await Promise.race([
        ordersPromise,
        ordersTimeoutPromise,
      ])) as any;

      if (ordersError) {
        console.warn("⚠️ Orders table error:", ordersError);
      } else {
        console.log("✅ Orders table accessible");
      }
    } catch (error) {
      console.warn("⚠️ Orders table query failed:", error);
    }

    console.log("🎉 Admin connection test completed!");
    return true;
  } catch (error) {
    console.error("❌ Admin connection test failed:", error);
    return false;
  }
};

// Make it available globally for debugging
(window as any).testAdminConnection = testAdminConnection;
