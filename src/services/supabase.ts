import { supabase } from "../lib/supabaseClient";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  weight: number; // in grams
  created_at: string;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
};

export type Order = {
  id: string;
  user_id: string;
  order_number?: string;
  subtotal: number;
  total: number;
  tax_amount?: number;
  shipping_amount?: number;
  discount_amount?: number;
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  payment_id?: string;
  payment_order_id?: string;
  payment_signature?: string;
  payment_status?: "pending" | "paid" | "failed" | "refunded";
  payment_method?: string;
  currency?: string;
  shipping_address?: any;
  billing_address?: any;
  notes?: string;
  admin_notes?: string;
  // Refund information
  refund_id?: string;
  refund_amount?: number;
  refund_reason?: string;
  refund_status?: "pending" | "processed" | "failed";
  refunded_at?: string;
  created_at: string;
  updated_at?: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total_price: number;
  product?: Product;
};

export type UserAddress = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
};

// Products Service
export const productsService = {
  async getAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      throw new Error("Failed to fetch products");
    }

    return data || [];
  },

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return null;
    }

    return data;
  },

  async createProduct(
    product: Omit<Product, "id" | "created_at">
  ): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      throw new Error("Failed to create product");
    }

    return data;
  },

  async ensureSampleProducts(): Promise<Product[]> {
    // Check if products exist
    const existingProducts = await this.getAllProducts();

    if (existingProducts.length > 0) {
      return existingProducts;
    }

    // Create sample products if none exist
    const sampleProducts = [
      {
        name: "Devanagari Health Mix 200g",
        description:
          "A premium blend of 21 natural grains, millets, and pulses, carefully crafted to provide complete nutrition. This 200g pack is perfect for trying our signature health mix.",
        price: 200.0,
        image_url: "/src/assets/shop/First page Flipkart.png",
        stock: 100,
        weight: 200,
      },
      {
        name: "Devanagari Health Mix 450g",
        description:
          "A premium blend of 21 natural grains, millets, and pulses, carefully crafted to provide complete nutrition. This 450g pack offers great value for regular consumption.",
        price: 400.0,
        image_url: "/src/assets/shop/First page Flipkart.png",
        stock: 100,
        weight: 450,
      },
      {
        name: "Devanagari Health Mix 900g",
        description:
          "A premium blend of 21 natural grains, millets, and pulses, carefully crafted to provide complete nutrition. This 900g family pack is perfect for households.",
        price: 800.0,
        image_url: "/src/assets/shop/First page Flipkart.png",
        stock: 100,
        weight: 900,
      },
    ];

    const createdProducts: Product[] = [];
    for (const product of sampleProducts) {
      try {
        const created = await this.createProduct(product);
        createdProducts.push(created);
      } catch (error) {
        console.error("Error creating sample product:", error);
      }
    }

    return createdProducts;
  },
};

// Cart Service
export const cartService = {
  async getCartItems(userId: string): Promise<CartItem[]> {
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        *,
        product:products(*)
      `
      )
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching cart items:", error);
      throw new Error("Failed to fetch cart items");
    }

    return data || [];
  },

  async addToCart(
    userId: string,
    productData: {
      name: string;
      weight: number;
      price: number;
      description?: string;
      image_url?: string;
    },
    quantity: number = 1
  ): Promise<void> {
    try {
      console.log("🛒 Adding to cart:", { productData, quantity, userId });

      // First, test if tables exist
      const { error: tableError } = await supabase
        .from("products")
        .select("count")
        .limit(1);

      if (tableError) {
        console.error("❌ Database table error:", tableError);
        if (
          tableError.code === "PGRST116" ||
          tableError.message.includes("relation") ||
          tableError.message.includes("does not exist")
        ) {
          throw new Error(
            "Database tables not found. Please run the SQL schema script in your Supabase dashboard first."
          );
        }
        throw new Error(`Database error: ${tableError.message}`);
      }

      // Ensure user exists in users table before proceeding
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (userCheckError && userCheckError.code !== "PGRST116") {
        console.error("Error checking user:", userCheckError);
        throw new Error(`Failed to check user: ${userCheckError.message}`);
      }

      if (!existingUser) {
        // Get current user from Supabase auth
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser) {
          throw new Error("User not authenticated. Please sign in again.");
        }

        // Create user in users table
        const { error: createUserError } = await supabase.from("users").insert({
          id: userId,
          email: authUser.email || "",
          full_name:
            authUser.user_metadata?.full_name || authUser.user_metadata?.name,
          avatar_url: authUser.user_metadata?.avatar_url,
        });

        if (createUserError) {
          console.error("Error creating user:", createUserError);
          if (createUserError.code === "23505") {
            // User already exists (unique constraint violation)
          } else {
            throw new Error(
              `Failed to create user: ${createUserError.message}`
            );
          }
        }
      }

      // First, ensure the product exists in the database
      let productId: string;

      // Check if product already exists
      const { data: existingProduct, error: productCheckError } = await supabase
        .from("products")
        .select("id")
        .eq("name", productData.name)
        .eq("weight", productData.weight)
        .single();

      if (productCheckError && productCheckError.code !== "PGRST116") {
        console.error("❌ Error checking existing product:", productCheckError);
        throw new Error(
          `Failed to check existing product: ${productCheckError.message}`
        );
      }

      if (existingProduct) {
        // Product exists, use its ID
        productId = existingProduct.id;
        console.log("Using existing product ID:", productId);
      } else {
        // Create new product
        const { data: newProduct, error: createError } = await supabase
          .from("products")
          .insert({
            name: productData.name,
            description:
              productData.description ||
              "A premium blend of 21 natural grains, millets, and pulses",
            price: productData.price,
            image_url:
              productData.image_url ||
              "/src/assets/shop/First page Flipkart.png",
            stock: 100,
            weight: productData.weight,
          })
          .select("id")
          .single();

        if (createError) {
          console.error("❌ Error creating product:", createError);
          throw new Error(`Failed to create product: ${createError.message}`);
        }

        productId = newProduct.id;
      }

      // Now handle cart item - use UPSERT to handle insert-or-update atomically
      const { data: existingCartItem, error: cartCheckError } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .single();

      if (cartCheckError && cartCheckError.code !== "PGRST116") {
        console.error("❌ Error checking existing cart item:", cartCheckError);
        throw new Error(`Failed to check cart item: ${cartCheckError.message}`);
      }

      if (existingCartItem) {
        // Update quantity - add to existing quantity
        const newQuantity = existingCartItem.quantity + quantity;

        const { error: updateError } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("id", existingCartItem.id);

        if (updateError) {
          console.error("Error updating cart item:", updateError);
          throw new Error(`Failed to update cart item: ${updateError.message}`);
        }
      } else {
        // Add new cart item
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            product_id: productId,
            quantity,
          });

        if (insertError) {
          console.error("Error adding to cart:", insertError);
          // If it's a unique constraint violation, try to update instead
          if (insertError.code === "23505") {
            const { data: existingItem, error: retryError } = await supabase
              .from("cart_items")
              .select("id, quantity")
              .eq("user_id", userId)
              .eq("product_id", productId)
              .single();

            if (retryError) {
              throw new Error(
                `Failed to add item to cart: ${insertError.message}`
              );
            }

            const { error: updateError } = await supabase
              .from("cart_items")
              .update({ quantity: existingItem.quantity + quantity })
              .eq("id", existingItem.id);

            if (updateError) {
              throw new Error(
                `Failed to update cart item: ${updateError.message}`
              );
            }
          } else {
            throw new Error(
              `Failed to add item to cart: ${insertError.message}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Cart service error:", error);
      throw error;
    }
  },

  async updateCartItemQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<void> {
    if (quantity <= 0) {
      await this.removeFromCart(cartItemId);
      return;
    }

    // First, verify the cart item exists and belongs to the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const { data: existingItem, error: checkError } = await supabase
      .from("cart_items")
      .select("id, user_id")
      .eq("id", cartItemId)
      .eq("user_id", user.id)
      .single();

    if (checkError) {
      console.error("❌ Error checking cart item:", checkError);
      throw new Error(
        `Cart item not found or access denied: ${checkError.message}`
      );
    }

    if (!existingItem) {
      throw new Error("Cart item not found or access denied");
    }

    // Update the quantity
    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId)
      .eq("user_id", user.id) // Double-check user ownership
      .select();

    if (error) {
      console.error("Error updating cart item quantity:", error);
      throw new Error(`Failed to update cart item quantity: ${error.message}`);
    }
  },

  async removeFromCart(cartItemId: string): Promise<void> {
    // First, verify the cart item exists and belongs to the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId)
      .eq("user_id", user.id); // Ensure user can only delete their own items

    if (error) {
      console.error("Error removing cart item:", error);
      throw new Error(`Failed to remove cart item: ${error.message}`);
    }
  },

  async clearCart(userId: string): Promise<void> {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error clearing cart:", error);
      throw new Error("Failed to clear cart");
    }
  },
};

// Orders Service
export const ordersService = {
  async createOrder(
    userId: string,
    cartItems: CartItem[],
    paymentData?: {
      payment_id?: string;
      payment_order_id?: string;
      payment_signature?: string;
      payment_status?: string;
      payment_method?: string;
      currency?: string;
    },
    shippingAmount: number = 99
  ): Promise<Order> {
    // If payment_id is provided, check if an order with this payment_id already exists
    if (paymentData?.payment_id) {
      const { data: existingOrder, error: checkError } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_id", paymentData.payment_id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected
        console.error("Error checking for existing order:", checkError);
        throw new Error(
          `Failed to check for existing order: ${checkError.message}`
        );
      }

      if (existingOrder) {
        console.log(
          "Order with this payment_id already exists:",
          existingOrder.id
        );
        return existingOrder;
      }
    }

    // Calculate subtotal and total
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);

    // Use the provided shipping amount (calculated in frontend based on pincode)
    const total = subtotal + shippingAmount;

    // Create order with payment information
    const orderData = {
      user_id: userId,
      subtotal,
      total,
      shipping_amount: shippingAmount,
      status: (paymentData?.payment_status === "paid"
        ? "processing"
        : "pending") as Order["status"],
      payment_id: paymentData?.payment_id,
      payment_order_id: paymentData?.payment_order_id,
      payment_signature: paymentData?.payment_signature,
      payment_status: (paymentData?.payment_status ||
        "pending") as Order["payment_status"],
      payment_method: paymentData?.payment_method || "razorpay",
      currency: paymentData?.currency || "USD",
    };

    console.log("💾 Creating order in database...");
    console.log("📊 Order data being saved:", orderData);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error("❌ Error creating order:", orderError);

      // If it's a duplicate key error, try to find the existing order
      if (
        orderError.code === "23505" &&
        orderError.message.includes("orders_order_number_key")
      ) {
        console.log(
          "Duplicate order number detected, attempting to find existing order..."
        );

        // Try to find an existing order with the same payment_id
        if (paymentData?.payment_id) {
          const { data: existingOrder, error: findError } = await supabase
            .from("orders")
            .select("*")
            .eq("payment_id", paymentData.payment_id)
            .single();

          if (findError && findError.code !== "PGRST116") {
            throw new Error(
              `Failed to find existing order: ${findError.message}`
            );
          }

          if (existingOrder) {
            console.log("Found existing order:", existingOrder.id);
            return existingOrder;
          }
        }
      }

      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Create order items
    console.log("💾 Creating order items in database...");
    const orderItems = cartItems.map((item) => {
      const productPrice = item.product?.price || 0;
      const quantity = item.quantity;
      const totalPrice = productPrice * quantity;

      return {
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product?.name || "Unknown Product",
        product_price: productPrice,
        quantity: quantity,
        total_price: totalPrice,
      };
    });

    console.log("📊 Order items being saved:", orderItems);

    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error("❌ Error creating order items:", orderItemsError);
      throw new Error(
        `Failed to create order items: ${orderItemsError.message}`
      );
    }

    console.log("✅ Order and order items created successfully!");
    return order;
  },

  async updateOrderPayment(
    orderId: string,
    paymentData: {
      payment_id: string;
      payment_signature: string;
      payment_status: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update({
        payment_id: paymentData.payment_id,
        payment_signature: paymentData.payment_signature,
        payment_status: paymentData.payment_status,
        status:
          paymentData.payment_status === "paid" ? "processing" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order payment:", error);
      throw new Error("Failed to update order payment");
    }
  },

  async getUserOrders(
    userId: string
  ): Promise<(Order & { order_items: OrderItem[] })[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          product:products(*)
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user orders:", error);
      throw new Error("Failed to fetch orders");
    }

    return data || [];
  },

  async updateOrderStatus(
    orderId: string,
    status: Order["status"]
  ): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order status:", error);
      throw new Error("Failed to update order status");
    }
  },

  async updateOrderRefund(
    orderId: string,
    refundData: {
      refund_id: string;
      refund_amount: number;
      refund_reason: string;
      refund_status: "pending" | "processed" | "failed";
      refunded_at: string;
      status?: "cancelled" | "refunded";
      payment_status?: "refunded";
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update(refundData)
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order refund:", error);
      throw new Error("Failed to update order refund");
    }
  },

  async cancelOrder(
    orderId: string,
    refundData?: {
      refund_id: string;
      refund_amount: number;
      refund_reason: string;
      refund_status: "pending" | "processed" | "failed";
      refunded_at: string;
    }
  ): Promise<void> {
    const updateData: any = {
      status: "cancelled",
      updated_at: new Date().toISOString(),
    };

    if (refundData) {
      updateData.payment_status = "refunded";
      updateData.refund_id = refundData.refund_id;
      updateData.refund_amount = refundData.refund_amount;
      updateData.refund_reason = refundData.refund_reason;
      updateData.refund_status = refundData.refund_status;
      updateData.refunded_at = refundData.refunded_at;
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select();

    if (error) {
      console.error("Error cancelling order:", error);
      throw new Error(`Failed to cancel order: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error("No data returned from order update");
    }
  },
};

// User Service
export const userService = {
  async createOrUpdateUser(user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  }): Promise<void> {
    try {
      console.log("Creating/updating user in database:", {
        id: user.id,
        email: user.email,
      });

      // First check if the users table exists by trying a simple select
      console.log("🔍 Checking if users table exists...");
      const { error: tableCheckError } = await supabase
        .from("users")
        .select("id")
        .limit(1);

      if (tableCheckError) {
        console.error("❌ Table check error:", tableCheckError);
        if (
          tableCheckError.code === "PGRST116" ||
          tableCheckError.message.includes("relation") ||
          tableCheckError.message.includes("does not exist")
        ) {
          throw new Error(
            "Database tables not found. Please run the SQL schema script in your Supabase dashboard first."
          );
        }
        throw new Error(`Database table error: ${tableCheckError.message}`);
      }

      console.log("✅ Users table exists, proceeding with upsert...");
      const { error } = await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: user.name,
        avatar_url: user.avatar_url,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("❌ Error creating/updating user:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        if (
          error.message.includes("full_name") &&
          error.message.includes("column")
        ) {
          throw new Error(
            "Database schema mismatch. Please run the SQL schema script in your Supabase dashboard to create the correct table structure."
          );
        }

        throw new Error(`Failed to create/update user: ${error.message}`);
      }

      console.log("✅ User successfully created/updated in database");
    } catch (error) {
      console.error("❌ User service error:", error);
      throw error;
    }
  },

  async getUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getUser:", error);
      return null;
    }
  },

  async ensureUserExists(user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  }): Promise<void> {
    try {
      // Check if user exists
      const existingUser = await this.getUser(user.id);

      if (!existingUser) {
        // User doesn't exist, create them
        console.log("User not found in database, creating new user...");
        await this.createOrUpdateUser(user);
      } else {
        // User exists, update their info and last_login
        console.log("User exists in database, updating info and last_login...");
        await this.updateUserLastLogin(user.id);
        await this.createOrUpdateUser(user);
      }
    } catch (error) {
      console.error("Error ensuring user exists:", error);
      throw error;
    }
  },

  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Error updating last_login:", error);
        throw error;
      }

      console.log("✅ User last_login updated successfully");
    } catch (error) {
      console.error("Error updating user last_login:", error);
      throw error;
    }
  },
};

// Address Service
export const addressService = {
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user addresses:", error);
      throw new Error(`Failed to fetch addresses: ${error.message}`);
    }

    return data || [];
  },

  async createAddress(
    userId: string,
    addressData: Omit<
      UserAddress,
      "id" | "user_id" | "created_at" | "updated_at"
    >
  ): Promise<UserAddress> {
    const { data, error } = await supabase
      .from("user_addresses")
      .insert({
        user_id: userId,
        ...addressData,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating address:", error);
      throw new Error(`Failed to create address: ${error.message}`);
    }

    return data;
  },

  async updateAddress(
    addressId: string,
    addressData: Partial<
      Omit<UserAddress, "id" | "user_id" | "created_at" | "updated_at">
    >
  ): Promise<UserAddress> {
    const { data, error } = await supabase
      .from("user_addresses")
      .update(addressData)
      .eq("id", addressId)
      .select()
      .single();

    if (error) {
      console.error("Error updating address:", error);
      throw new Error(`Failed to update address: ${error.message}`);
    }

    return data;
  },

  async deleteAddress(addressId: string): Promise<void> {
    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", addressId);

    if (error) {
      console.error("Error deleting address:", error);
      throw new Error(`Failed to delete address: ${error.message}`);
    }
  },

  async setDefaultAddress(addressId: string, userId: string): Promise<void> {
    // First, set all addresses for this user to not default
    const { error: unsetError } = await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("user_id", userId);

    if (unsetError) {
      console.error("Error unsetting default addresses:", unsetError);
      throw new Error(
        `Failed to unset default addresses: ${unsetError.message}`
      );
    }

    // Then set the specified address as default
    const { error: setError } = await supabase
      .from("user_addresses")
      .update({ is_default: true })
      .eq("id", addressId)
      .eq("user_id", userId);

    if (setError) {
      console.error("Error setting default address:", setError);
      throw new Error(`Failed to set default address: ${setError.message}`);
    }
  },
};
