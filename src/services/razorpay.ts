import { supabase } from "../lib/supabaseClient";

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CheckoutItem {
  product_id: string;
  quantity: number;
}

export interface CheckoutQuote {
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total: number;
  promo_code: string | null;
}

export interface CancelOrderResponse {
  cancelled: boolean;
  refund: { id: string; amount: number; status: string; created_at: number } | null;
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
  quote?: CheckoutQuote;
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
  order?: {
    id: string;
    order_number?: string;
    total: number;
    currency?: string;
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
  import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;

// Sends the signed-in user's Supabase access token so the server can verify who is calling.
async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to continue");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || `HTTP error! status: ${response.status}`;
  } catch {
    return `HTTP error! status: ${response.status}`;
  }
}

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

  /**
   * Starts checkout. Only product IDs, quantities, the saved address and promo code
   * are sent; the server looks up prices and calculates the amount to charge.
   */
  async createOrder(
    items: CheckoutItem[],
    addressId: string,
    promoCode?: string | null
  ): Promise<RazorpayOrder> {
    const response = await fetch(`${API_BASE_URL}/razorpay/create-order`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        items,
        address_id: addressId,
        promo_code: promoCode || null,
      }),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return (await response.json()) as RazorpayOrder;
  },

  async openPaymentModal(
    order: RazorpayOrder,
    userEmail: string,
    userName: string,
    userPhone?: string,
    onSuccess?: (response: RazorpayPaymentResponse) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!window.Razorpay) {
        const error = new Error(
          "Razorpay SDK not loaded. Please refresh the page and try again."
        );
        console.error("❌ Razorpay SDK not found");
        onError?.(error);
        reject(error);
        return;
      }

      // Get Razorpay configuration from server
      let config: RazorpayConfig;
      try {
        config = await this.getConfig();
      } catch (error) {
        console.error("❌ Failed to get Razorpay config:", error);
        onError?.(error as Error);
        reject(error);
        return;
      }

      const options: RazorpayOptions = {
        key: config.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Devanagari Web",
        description: "Purchase from Devanagari Web Store",
        image: "/logo.png",
        order_id: order.id,
        handler: (response: RazorpayPaymentResponse) => {
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

  /** Verifies the payment on the server, which then saves the order. */
  async verifyPayment(
    paymentData: RazorpayPaymentResponse
  ): Promise<PaymentVerificationResponse> {
    const response = await fetch(`${API_BASE_URL}/razorpay/verify-payment`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return (await response.json()) as PaymentVerificationResponse;
  },

  /** Cancels an order; the server refunds it in full if it was paid. */
  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    const response = await fetch(
      `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/cancel`,
      { method: "POST", headers: await authHeaders() }
    );

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return (await response.json()) as CancelOrderResponse;
  },

  async getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/razorpay/payment/${encodeURIComponent(paymentId)}`,
        { headers: await authHeaders() }
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
      const response = await fetch(
        `${API_BASE_URL}/razorpay/order/${encodeURIComponent(orderId)}`,
        { headers: await authHeaders() }
      );

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
        console.log("💸 Refund amount conversion:", {
          amount_inr: amount,
          amount_paise: refundData.amount,
          payment_id: paymentId,
        });
      }

      const response = await fetch(
        `${API_BASE_URL}/razorpay/payment/${encodeURIComponent(paymentId)}/refund`,
        {
          method: "POST",
          headers: await authHeaders(),
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
};

export default razorpayService;
