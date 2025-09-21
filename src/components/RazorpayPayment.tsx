import React, { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import razorpayService, {
  type RazorpayFailureResponse,
  type RazorpayPaymentResponse,
  type CartItem,
} from "../services/razorpay";

interface RazorpayPaymentProps {
  amount: number; // Amount in USD
  cartItems?: CartItem[]; // Cart items for order creation
  currency?: string;
  onSuccess: (paymentResponse: RazorpayPaymentResponse) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  amount,
  cartItems = [],
  currency = "INR",
  onSuccess,
  onError,
  disabled = false,
  className = "",
  children,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const handlePayment = async () => {
    if (!user?.email) {
      onError(new Error("Please sign in to make a payment"));
      return;
    }

    try {
      setIsProcessing(true);

      console.log("Processing payment:", {
        originalAmount: amount,
        currency,
        user: user.email,
        itemsCount: cartItems.length,
      });

      // Create order on server (amount is already in INR)
      const order = await razorpayService.createOrder(
        amount, // Amount in INR
        cartItems, // Cart items
        user.email
      );

      // Get user information
      const userName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Customer";

      const userPhone = user.user_metadata?.phone || "";

      // Check if Razorpay SDK is loaded
      if (!window.Razorpay) {
        throw new Error(
          "Razorpay SDK not loaded. Please refresh the page and try again."
        );
      }

      // Get Razorpay configuration
      const config = await razorpayService.getConfig();

      // Configure Razorpay options
      const options = {
        key: config.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Devanagari Web",
        description: "Purchase from Devanagari Web Store",
        image: "/logo.png",
        order_id: order.id,
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            console.log("✅ Payment successful:", response.razorpay_payment_id);

            // Verify payment on server
            const verificationResult = await razorpayService.verifyPayment(
              response
            );

            if (verificationResult.isValid) {
              console.log("✅ Payment verified successfully");
              onSuccess(response);
            } else {
              console.error("❌ Payment verification failed");
              throw new Error(
                "Payment verification failed. Please contact support."
              );
            }
          } catch (verifyError) {
            console.error("Payment verification error:", verifyError);
            const errorMsg =
              verifyError instanceof Error
                ? verifyError.message
                : "Unknown error";
            onError(new Error(`Payment verification failed: ${errorMsg}`));
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: userName,
          email: user.email,
          contact: userPhone,
        },
        notes: {
          address: "Devanagari Web Store",
        },
        theme: {
          color: "#4A5C3D",
        },
        modal: {
          ondismiss: () => {
            const error = new Error("Payment cancelled by user");
            console.log("❌ Payment cancelled");
            setIsProcessing(false);
            onError(error);
          },
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        timeout: 300, // 5 minutes
        remember_customer: true,
      };

      // Create and open Razorpay instance
      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on(
        "payment.failed",
        (response: RazorpayFailureResponse) => {
          const error = new Error(
            `Payment failed: ${response.error.description}`
          );
          console.error("❌ Payment failed:", response.error);
          setIsProcessing(false);
          onError(error);
        }
      );

      razorpayInstance.open();
    } catch (error) {
      console.error("Payment error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Payment failed";
      if (error instanceof Error) {
        if (error.message.includes("cancelled")) {
          errorMessage = "Payment was cancelled";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("verification")) {
          errorMessage = error.message;
        } else if (error.message.includes("SDK not loaded")) {
          errorMessage =
            "Payment system not ready. Please refresh the page and try again.";
        } else if (error.message.includes("configuration")) {
          errorMessage =
            "Payment system configuration error. Please contact support.";
        } else {
          errorMessage = error.message || "An unexpected error occurred";
        }
      }

      onError(new Error(errorMessage));
      setIsProcessing(false);
    }
  };

  // Format display amount
  const getDisplayAmount = () => {
    try {
      if (currency === "INR") {
        // Show amount in INR
        return `₹${amount.toFixed(2)}`;
      } else {
        // Show amount in the specified currency
        return `${currency === "USD" ? "$" : "₹"}${amount.toFixed(2)}`;
      }
    } catch (error) {
      console.warn("Error formatting amount:", error);
      return `₹${amount.toFixed(2)}`;
    }
  };

  // Check if user is authenticated
  const isUserAuthenticated = !!user?.email;

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || isProcessing || !isUserAuthenticated}
      className={`
        flex items-center justify-center space-x-2 
        bg-[#4A5C3D] text-white font-semibold
        px-6 py-3 rounded-lg transition-all duration-200
        hover:bg-[#3a4a2f] hover:scale-[1.02]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus:ring-2 focus:ring-[#4A5C3D] focus:ring-opacity-50
        ${className}
      `}
      type="button"
      aria-label={
        !isUserAuthenticated
          ? "Sign in to pay"
          : isProcessing
          ? "Processing payment"
          : `Pay ${getDisplayAmount()}`
      }
    >
      {!isUserAuthenticated ? (
        <>
          <CreditCard size={20} />
          <span>Sign in to Pay</span>
        </>
      ) : isProcessing ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          <span>Processing Payment...</span>
        </>
      ) : children ? (
        children
      ) : (
        <>
          <CreditCard size={20} />
          <span>Pay {getDisplayAmount()}</span>
        </>
      )}
    </button>
  );
};

export default RazorpayPayment;
