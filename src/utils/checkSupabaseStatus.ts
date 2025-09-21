// Check Supabase project status and connectivity
export const checkSupabaseStatus = async () => {
  console.log("🔍 Checking Supabase Project Status");
  console.log("===================================");

  // Get credentials from environment variables
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "❌ Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    );
    return;
  }

  try {
    // Test 1: Check if Supabase URL is reachable
    console.log("1. Testing Supabase URL connectivity...");
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "HEAD",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("✅ Supabase URL is reachable");
    } else {
      console.log(
        "❌ Supabase URL returned:",
        response.status,
        response.statusText
      );
    }

    // Test 2: Check project status
    console.log("\n2. Checking project status...");
    const projectResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log("Project response status:", projectResponse.status);

    // Test 3: Check if tables exist
    console.log("\n3. Checking if tables exist...");
    const tablesResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=count`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (tablesResponse.ok) {
      const data = await tablesResponse.json();
      console.log("✅ Products table accessible, count:", data.length);
    } else {
      console.log(
        "❌ Products table error:",
        tablesResponse.status,
        tablesResponse.statusText
      );
    }

    console.log("\n🎯 Next steps:");
    console.log(
      `1. Check your Supabase dashboard at: ${SUPABASE_URL.replace(
        "/rest/v1",
        ""
      )}`
    );
    console.log("2. Verify your project is active and not paused");
    console.log("3. Check if your database schema is set up correctly");
    console.log("4. Verify your API keys are correct");
  } catch (error) {
    console.error("❌ Supabase status check failed:", error);
    console.log("\n🚨 Possible issues:");
    console.log("- Project might be paused or deleted");
    console.log("- Network connectivity issues");
    console.log("- API keys might be incorrect");
    console.log("- Database might not be set up");
  }
};

// Make it available globally
(window as any).checkSupabaseStatus = checkSupabaseStatus;
