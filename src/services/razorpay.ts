export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, unknown>;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentVerificationResponse {
  isValid: boolean;
  payment_id: string;
  order_id: string;
  payment_details?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    captured: boolean;
    created_at: number;
  };
  order_details?: {
    id: string;
    amount: number;
    status: string;
    receipt: string;
  };
  error?: string;
}

export interface PaymentDetails {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  created_at: number;
}

export interface RefundResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  speed_processed: string;
  speed_requested: string;
  receipt?: string;
  notes: Record<string, unknown>;
  created_at: number;
}

export interface RazorpayError {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: Record<string, unknown>;
}

export interface RazorpayFailureResponse {
  error: RazorpayError;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, unknown>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  timeout?: number;
  remember_customer?: boolean;
  method?: {
    netbanking?: boolean;
    wallet?: boolean;
    upi?: boolean;
    emi?: boolean;
    card?: boolean;
  };
}

export interface RazorpayInstance {
  open(): void;
  on(
    event: "payment.failed",
    callback: (response: RazorpayFailureResponse) => void
  ): void;
  on(event: string, callback: (response: unknown) => void): void;
}

export interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
  (options: RazorpayOptions): RazorpayInstance;
}

export interface RazorpayConfig {
  key_id: string;
  currency: string;
  environment: string;
}

// Add this declaration to inform TypeScript about window.Razorpay
declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

const razorpayService = {
  async getConfig(): Promise<RazorpayConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/razorpay/config`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return (await response.json()) as RazorpayConfig;
    } catch (error) {
      console.error("❌ Failed to get Razorpay config:", error);
      throw new Error("Failed to get Razorpay configuration");
    }
  },

  async createOrder(
    amountInINR: number,
    cartItems: CartItem[],
    userEmail?: string
  ): Promise<RazorpayOrder> {
    try {
      // Amount is already in INR, convert to paise
      const amountInPaise = Math.round(amountInINR * 100);

      const orderData = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          user_email: userEmail,
          items_count: cartItems.length,
          items: JSON.stringify(
            cartItems.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price_inr: item.price,
            }))
          ),
          original_amount_inr: amountInINR,
          created_from: "devanagari_web",
        },
      };

      console.log("📦 Creating Razorpay order:", {
        amount_inr: amountInINR,
        amount_paise: amountInPaise,
        items_count: cartItems.length,
      });

      const response = await fetch(`${API_BASE_URL}/razorpay/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const order = (await response.json()) as RazorpayOrder;
      console.log("✅ Razorpay order created:", order.id);
      return order;
    } catch (error) {
      console.error("❌ Failed to create Razorpay order:", error);
      throw new Error(
        `Failed to create order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  async openPaymentModal(
    order: RazorpayOrder,
    userEmail: string,
    userName: string,
    userPhone?: string,
    onSuccess?: (response: RazorpayPaymentResponse) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        const error = new Error(
          "Razorpay SDK not loaded. Please refresh the page and try again."
        );
        console.error("❌ Razorpay SDK not found");
        onError?.(error);
        reject(error);
        return;
      }

      const options: RazorpayOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Devanagari Web",
        description: "Purchase from Devanagari Web Store",
        image: "/logo.png",
        order_id: order.id,
        handler: (response: RazorpayPaymentResponse) => {
          console.log("✅ Payment successful:", response.razorpay_payment_id);
          onSuccess?.(response);
          resolve();
        },
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone || "",
        },
        notes: {
          address: "Devanagari Web Store",
          country: "IN",
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          ondismiss: () => {
            const error = new Error("Payment cancelled by user");
            console.log("❌ Payment cancelled");
            onError?.(error);
            reject(error);
          },
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        timeout: 300,
        remember_customer: true,
        method: {
          netbanking: true,
          wallet: true,
          upi: true,
          emi: true,
          card: true,
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on(
        "payment.failed",
        (response: RazorpayFailureResponse) => {
          const error = new Error(
            `Payment failed: ${response.error.description}`
          );
          console.error("❌ Payment failed:", response.error);
          onError?.(error);
          reject(error);
        }
      );

      razorpayInstance.open();
    });
  },

  async verifyPayment(
    paymentData: RazorpayPaymentResponse
  ): Promise<PaymentVerificationResponse> {
    try {
      console.log("🔐 Verifying payment:", paymentData.razorpay_payment_id);

      const response = await fetch(`${API_BASE_URL}/razorpay/verify-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const result = (await response.json()) as PaymentVerificationResponse;

      if (result.isValid) {
        console.log("✅ Payment verified successfully");
      } else {
        console.log("❌ Payment verification failed");
      }

      return result;
    } catch (error) {
      console.error("❌ Failed to verify payment:", error);
      throw new Error(
        `Payment verification failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  async getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/razorpay/payment/${paymentId}`
      );

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return (await response.json()) as PaymentDetails;
    } catch (error) {
      console.error("❌ Failed to get payment details:", error);
      throw new Error(
        `Failed to get payment details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  async getOrderDetails(orderId: string): Promise<RazorpayOrder> {
    try {
      const response = await fetch(`${API_BASE_URL}/razorpay/order/${orderId}`);

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return (await response.json()) as RazorpayOrder;
    } catch (error) {
      console.error("❌ Failed to get order details:", error);
      throw new Error(
        `Failed to get order details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  convertUSDtoINR(usdAmount: number): number {
    const conversionRate = 83; // Example: 1 USD = 83 INR
    return Math.round(usdAmount * conversionRate);
  },

  formatAmount(amountInPaise: number, currency: string = "INR"): string {
    const amount = amountInPaise / 100;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  },

  convertUSDToINRDisplay(amountInUSD: number): {
    inr: number;
    formatted: string;
  } {
    const usdToInrRate = 83;
    const inr = Math.round(amountInUSD * usdToInrRate);
    const formatted = this.formatAmount(inr * 100);
    return { inr, formatted };
  },

  async processRefund(
    paymentId: string,
    amount?: number,
    reason?: string,
    speed: "normal" | "optimum" = "normal"
  ): Promise<RefundResponse> {
    try {
      console.log("💸 Processing refund:", {
        paymentId,
        amount,
        reason,
        speed,
      });

      const refundData: any = {
        payment_id: paymentId,
        speed,
        notes: {
          refund_reason: reason || "Customer request",
          created_at: new Date().toISOString(),
          processed_from: "devanagari_web",
        },
      };

      if (amount) {
        // Amount is already in INR from database, just convert to paise
        refundData.amount = Math.round(amount * 100); // Convert INR to paise
      }

      const response = await fetch(
        `${API_BASE_URL}/razorpay/payment/${paymentId}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(refundData),
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = (await response.json()) as {
            error: string;
            code?: string;
          };
          errorMessage = errorData.error || errorMessage;
          console.error("❌ Server error response:", errorData);
        } catch (parseError) {
          console.error("❌ Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const refund = (await response.json()) as RefundResponse;
      console.log("✅ Refund processed successfully:", refund.id);
      return refund;
    } catch (error) {
      console.error("❌ Failed to process refund:", error);
      throw new Error(
        `Refund processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },

  async getRefundDetails(refundId: string): Promise<RefundResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/razorpay/refund/${refundId}`
      );

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string };
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return (await response.json()) as RefundResponse;
    } catch (error) {
      console.error("❌ Failed to get refund details:", error);
      throw new Error(
        `Failed to get refund details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  },
};

export default razorpayService;
