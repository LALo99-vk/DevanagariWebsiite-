// Direct REST API calls to Supabase (bypassing the client library that times out)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set"
  );
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export const supabaseRestApi = {
  // Get products
  async getProducts() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Products fetch failed: ${response.status}`);
    }

    return await response.json();
  },

  // Get products count
  async getProductsCount() {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=count`,
      {
        method: "GET",
        headers: {
          ...headers,
          Prefer: "count=exact",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Products count fetch failed: ${response.status}`);
    }

    const countStr =
      response.headers.get("content-range")?.split("/")[1] || "0";
    return parseInt(countStr, 10) || 0;
  },

  // Get orders
  async getOrders() {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=*,user:users(name,email),order_items(*,product:products(name,image_url))&order=created_at.desc`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Orders fetch failed: ${response.status}`);
    }

    return await response.json();
  },

  // Get orders count
  async getOrdersCount() {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=count`,
      {
        method: "GET",
        headers: {
          ...headers,
          Prefer: "count=exact",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Orders count fetch failed: ${response.status}`);
    }

    const countStr =
      response.headers.get("content-range")?.split("/")[1] || "0";
    return parseInt(countStr, 10) || 0;
  },

  // Get users
  async getUsers() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Users fetch failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  },

  // Get users count
  async getUsersCount() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, {
      method: "GET",
      headers: {
        ...headers,
        Prefer: "count=exact",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Users count fetch failed: ${response.status} - ${errorText}`
      );
    }

    const countStr =
      response.headers.get("content-range")?.split("/")[1] || "0";
    return parseInt(countStr, 10) || 0;
  },

  // Get refunds (orders with refund_id OR cancelled orders)
  async getRefunds() {
    try {
      // First try the OR query
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?select=*,user:users(name,email)&or=(refund_id.not.is.null,status.eq.cancelled)&order=refunded_at.desc.nulls.last,created_at.desc`,
        {
          method: "GET",
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Refunds query result (OR):", data.length, "items");
        return data;
      } else {
        console.warn("OR query failed, trying alternative approach...");
        throw new Error(`OR query failed: ${response.status}`);
      }
    } catch (error) {
      console.warn("OR query failed, trying separate queries...", error);

      try {
        // Fallback: Get orders with refund_id
        const refundsResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?select=*,user:users(name,email)&refund_id=not.is.null&order=refunded_at.desc`,
          {
            method: "GET",
            headers,
          }
        );

        // Get cancelled orders
        const cancelledResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?select=*,user:users(name,email)&status=eq.cancelled&order=created_at.desc`,
          {
            method: "GET",
            headers,
          }
        );

        let refunds = [];
        let cancelled = [];

        if (refundsResponse.ok) {
          refunds = await refundsResponse.json();
          console.log("🔍 Orders with refund_id:", refunds.length, "items");
        }

        if (cancelledResponse.ok) {
          cancelled = await cancelledResponse.json();
          console.log("🔍 Cancelled orders:", cancelled.length, "items");
        }

        // Combine and deduplicate
        const allRefunds = [...refunds, ...cancelled];
        const uniqueRefunds = allRefunds.filter(
          (refund, index, self) =>
            index === self.findIndex((r) => r.id === refund.id)
        );

        console.log(
          "🔍 Combined refunds result:",
          uniqueRefunds.length,
          "items"
        );
        return uniqueRefunds;
      } catch (fallbackError) {
        console.error("Both queries failed:", fallbackError);
        throw new Error(`Refunds fetch failed: ${fallbackError.message}`);
      }
    }
  },

  // Get user by ID
  async getUserById(userId: string) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?select=is_admin,role,full_name,is_active,last_login,created_at&id=eq.${userId}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`User fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return data[0] || null;
  },

  // Update user
  async updateUser(userId: string, updates: any) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error(`User update failed: ${response.status}`);
    }

    return await response.json();
  },
};

// Test function to verify REST API works
export const testRestApi = async () => {
  console.log("🔍 Testing Supabase REST API");
  console.log("============================");

  try {
    console.log("1. Testing products...");
    const products = await supabaseRestApi.getProducts();
    console.log("✅ Products:", products.length, "items");

    console.log("2. Testing orders...");
    const orders = await supabaseRestApi.getOrders();
    console.log("✅ Orders:", orders.length, "items");

    // Log order details for debugging
    if (orders.length > 0) {
      console.log("📋 Order details:");
      orders.forEach((order, index) => {
        console.log(`  Order ${index + 1}:`, {
          id: order.id,
          status: order.status,
          payment_status: order.payment_status,
          refund_id: order.refund_id,
          refund_status: order.refund_status,
          created_at: order.created_at,
        });
      });
    }

    console.log("3. Testing users...");
    const users = await supabaseRestApi.getUsers();
    console.log("✅ Users:", users.length, "items");

    console.log("4. Testing refunds...");
    const refunds = await supabaseRestApi.getRefunds();
    console.log("✅ Refunds:", refunds.length, "items");

    // Log refund details for debugging
    if (refunds.length > 0) {
      console.log("💰 Refund details:");
      refunds.forEach((refund, index) => {
        console.log(`  Refund ${index + 1}:`, {
          id: refund.id,
          status: refund.status,
          payment_status: refund.payment_status,
          refund_id: refund.refund_id,
          refund_status: refund.refund_status,
          refund_amount: refund.refund_amount,
          created_at: refund.created_at,
        });
      });
    }

    console.log("\n🎉 REST API is working! Your real data is accessible!");
    return true;
  } catch (error) {
    console.error("❌ REST API test failed:", error);
    return false;
  }
};

// Test function specifically for refunds debugging
export const testRefundsQuery = async () => {
  console.log("🔍 Testing Refunds Query");
  console.log("========================");

  try {
    // Test 1: Get all orders first
    console.log("1. Fetching all orders...");
    const allOrders = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`,
      {
        method: "GET",
        headers,
      }
    );

    if (!allOrders.ok) {
      throw new Error(`All orders fetch failed: ${allOrders.status}`);
    }

    const orders = await allOrders.json();
    console.log(`✅ Found ${orders.length} total orders`);

    if (orders.length > 0) {
      console.log("📋 All orders status breakdown:");
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});
      console.log("Status counts:", statusCounts);

      // Show orders with refund data
      const ordersWithRefunds = orders.filter((order) => order.refund_id);
      console.log(`💰 Orders with refund_id: ${ordersWithRefunds.length}`);

      // Show cancelled orders
      const cancelledOrders = orders.filter(
        (order) => order.status === "cancelled"
      );
      console.log(`❌ Cancelled orders: ${cancelledOrders.length}`);

      if (cancelledOrders.length > 0) {
        console.log("Cancelled order details:");
        cancelledOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. Order ${order.id}:`, {
            status: order.status,
            payment_status: order.payment_status,
            refund_id: order.refund_id,
            refund_status: order.refund_status,
            created_at: order.created_at,
          });
        });
      }
    } else {
      console.log("⚠️ NO ORDERS FOUND IN DATABASE!");
      console.log("💡 This means:");
      console.log("   - No orders have been created yet");
      console.log("   - Orders table might be empty");
      console.log("   - There might be a database connection issue");
      console.log("\n🔧 To test refunds, you need to:");
      console.log(
        "   1. Create an order first (go to shop, add items, checkout)"
      );
      console.log("   2. Cancel that order");
      console.log("   3. Then check refunds section");
    }

    // Test 2: Test the refunds query
    console.log("\n2. Testing refunds query...");
    const refunds = await supabaseRestApi.getRefunds();
    console.log(`✅ Refunds query returned: ${refunds.length} items`);

    if (refunds.length > 0) {
      console.log("💰 Refund query results:");
      refunds.forEach((refund, index) => {
        console.log(`  ${index + 1}. Order ${refund.id}:`, {
          status: refund.status,
          payment_status: refund.payment_status,
          refund_id: refund.refund_id,
          refund_status: refund.refund_status,
          refund_amount: refund.refund_amount,
          created_at: refund.created_at,
        });
      });
    } else {
      console.log("⚠️ No refunds found. This could mean:");
      console.log("   - No orders have been cancelled");
      console.log("   - No orders have refund_id set");
      console.log("   - The query filter is too restrictive");
    }

    return refunds;
  } catch (error) {
    console.error("❌ Refunds test failed:", error);
    return [];
  }
};

// Test function to check database tables and data
export const testDatabaseTables = async () => {
  console.log("🔍 Testing Database Tables");
  console.log("==========================");

  try {
    // Test orders table
    console.log("1. Testing orders table...");
    const ordersResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=count`,
      {
        method: "GET",
        headers: {
          ...headers,
          Prefer: "count=exact",
        },
      }
    );

    if (ordersResponse.ok) {
      const countStr =
        ordersResponse.headers.get("content-range")?.split("/")[1] || "0";
      const orderCount = parseInt(countStr, 10) || 0;
      console.log(`✅ Orders table: ${orderCount} records`);
    } else {
      console.log("❌ Orders table error:", ordersResponse.status);
    }

    // Test products table
    console.log("2. Testing products table...");
    const productsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=count`,
      {
        method: "GET",
        headers: {
          ...headers,
          Prefer: "count=exact",
        },
      }
    );

    if (productsResponse.ok) {
      const countStr =
        productsResponse.headers.get("content-range")?.split("/")[1] || "0";
      const productCount = parseInt(countStr, 10) || 0;
      console.log(`✅ Products table: ${productCount} records`);
    } else {
      console.log("❌ Products table error:", productsResponse.status);
    }

    // Test users table
    console.log("3. Testing users table...");
    const usersResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/users?select=count`,
      {
        method: "GET",
        headers: {
          ...headers,
          Prefer: "count=exact",
        },
      }
    );

    if (usersResponse.ok) {
      const countStr =
        usersResponse.headers.get("content-range")?.split("/")[1] || "0";
      const userCount = parseInt(countStr, 10) || 0;
      console.log(`✅ Users table: ${userCount} records`);
    } else {
      console.log("❌ Users table error:", usersResponse.status);
    }

    console.log("\n🎉 Database table test completed!");
    return true;
  } catch (error) {
    console.error("❌ Database table test failed:", error);
    return false;
  }
};

// Test function to check Razorpay server status
export const testRazorpayServer = async () => {
  console.log("🔍 Testing Razorpay Server");
  console.log("=========================");

  try {
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
    console.log("🔗 API Base URL:", API_BASE_URL);

    // Test 1: Health check
    console.log("1. Testing server health...");
    const healthResponse = await fetch(
      `${API_BASE_URL.replace("/api", "")}/health`
    );
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log("✅ Server health:", healthData);
    } else {
      console.log("❌ Server health check failed:", healthResponse.status);
    }

    // Test 2: Razorpay config
    console.log("2. Testing Razorpay config...");
    const configResponse = await fetch(`${API_BASE_URL}/razorpay/config`);
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log("✅ Razorpay config:", configData);
    } else {
      console.log("❌ Razorpay config failed:", configResponse.status);
      const errorText = await configResponse.text();
      console.log("Error details:", errorText);
    }

    // Test 3: Create order endpoint
    console.log("3. Testing create order endpoint...");
    const createOrderResponse = await fetch(
      `${API_BASE_URL}/razorpay/create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 100, // 1 rupee in paise
          currency: "INR",
          receipt: "test_receipt",
          notes: { test: true },
        }),
      }
    );

    if (createOrderResponse.ok) {
      const orderData = await createOrderResponse.json();
      console.log("✅ Create order test successful:", orderData);
    } else {
      console.log("❌ Create order test failed:", createOrderResponse.status);
      const errorText = await createOrderResponse.text();
      console.log("Error details:", errorText);
    }

    console.log("\n🎉 Razorpay server test completed!");
    return true;
  } catch (error) {
    console.error("❌ Razorpay server test failed:", error);
    return false;
  }
};

// Make it available globally
(window as any).testRestApi = testRestApi;
(window as any).testRefundsQuery = testRefundsQuery;
(window as any).testDatabaseTables = testDatabaseTables;
(window as any).testRazorpayServer = testRazorpayServer;
