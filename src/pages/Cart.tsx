import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { ordersService, addressService } from "../services/supabase";
import RazorpayPayment from "../components/RazorpayPayment";
import ConfirmationModal from "../components/ConfirmationModal";
import CheckoutModal from "../components/CheckoutModal";

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const Cart = () => {
  const {
    items: cartItems,
    updateQty,
    removeItem,
    totalItems,
    totalPrice,
    clearCart,
    loading,
  } = useCart();
  const { user } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkingAddress, setCheckingAddress] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressConfirmModal, setShowAddressConfirmModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const getSubtotal = (price: number, qty: number) => price * qty;

  const checkUserAddresses = async () => {
    if (!user) return false;

    setCheckingAddress(true);
    try {
      const addresses = await addressService.getUserAddresses(user.id);
      setUserAddresses(addresses);

      if (addresses.length === 0) {
        // No addresses found, show confirmation modal
        setShowAddressConfirmModal(true);
        return false;
      } else {
        // Addresses found, show confirmation dialog
        setShowAddressDialog(true);
        return true;
      }
    } catch (error) {
      console.error("Error checking addresses:", error);
      showError("Address Error", "Error loading addresses. Please try again.");
      return false;
    } finally {
      setCheckingAddress(false);
    }
  };

  const handleAddressSelection = (address: any) => {
    setSelectedAddress(address);
  };

  const handleAddressConfirm = () => {
    setShowAddressConfirmModal(false);
    window.location.href = "/settings?tab=addresses";
  };

  const proceedWithPayment = async () => {
    if (!selectedAddress) {
      showWarning("Address Required", "Please select a delivery address");
      return;
    }

    setShowAddressDialog(false);

    // Now initiate the actual Razorpay payment
    try {
      // Import RazorpayPayment component dynamically or use the service directly
      const { default: RazorpayPayment } = await import(
        "../components/RazorpayPayment"
      );

      // Create a temporary payment handler
      const paymentHandler = {
        initiatePayment: async () => {
          // This will be handled by the RazorpayPayment component
          console.log(
            "Initiating payment with selected address:",
            selectedAddress
          );
        },
      };

      // For now, let's use the Razorpay service directly
      await initiateRazorpayPayment();
    } catch (error) {
      console.error("Error initiating payment:", error);
      showError("Payment Error", "Error initiating payment. Please try again.");
    }
  };

  const initiateRazorpayPayment = async () => {
    if (!user?.email) {
      showError("Authentication Required", "Please sign in to make a payment");
      return;
    }

    try {
      setPlacingOrder(true);

      // Import Razorpay service
      const razorpayModule = await import("../services/razorpay");
      console.log("🔍 Razorpay module imported:", razorpayModule);
      const razorpayService = razorpayModule.default;
      console.log("🔍 Razorpay service:", razorpayService);
      console.log(
        "🔍 Razorpay service methods:",
        Object.keys(razorpayService || {})
      );

      const amount = totalPrice; // No shipping charges

      console.log("Processing payment:", {
        originalAmount: amount,
        currency: "INR",
        user: user.email,
        itemsCount: cartItems.length,
        selectedAddress: selectedAddress,
      });

      // Create order on server
      console.log("🔍 Calling razorpayService.createOrder with:", {
        amount,
        cartItems: cartItems.length,
        userEmail: user.email,
      });

      if (
        !razorpayService ||
        typeof razorpayService.createOrder !== "function"
      ) {
        throw new Error(
          "Razorpay service not properly loaded. createOrder method is undefined."
        );
      }

      const order = await razorpayService.createOrder(
        amount,
        cartItems,
        user.email
      );

      console.log("✅ Order created successfully:", order);

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
              await handlePaymentSuccess(response);
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
            handlePaymentError(
              new Error(`Payment verification failed: ${errorMsg}`)
            );
          }
        },
        prefill: {
          name: userName,
          email: user.email,
          contact: userPhone,
        },
        notes: {
          address: `${selectedAddress.name}, ${selectedAddress.address_line_1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}, ${selectedAddress.country}`,
          address_id: selectedAddress.id,
        },
        theme: {
          color: "#4A5C3D",
        },
        modal: {
          ondismiss: () => {
            const error = new Error("Payment cancelled by user");
            console.log("❌ Payment cancelled");
            setPlacingOrder(false);
            handlePaymentError(error);
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
      razorpayInstance.open();
    } catch (error) {
      console.error("Payment initiation error:", error);
      handlePaymentError(
        error instanceof Error ? error : new Error("Unknown error")
      );
    }
  };

  const handlePaymentSuccess = async (
    paymentResponse: RazorpayPaymentResponse
  ) => {
    if (!user) {
      showError("Authentication Required", "Please sign in to place an order");
      return;
    }

    // Prevent multiple simultaneous order creation attempts
    if (placingOrder) {
      console.log(
        "Order creation already in progress, ignoring duplicate request"
      );
      return;
    }

    setPlacingOrder(true);
    try {
      console.log("🎉 Payment successful, creating order...", {
        paymentId: paymentResponse.razorpay_payment_id,
        orderId: paymentResponse.razorpay_order_id,
        cartItemsCount: cartItems.length,
        userId: user.id,
      });

      // Create order with payment information
      const paymentData = {
        payment_id: paymentResponse.razorpay_payment_id,
        payment_order_id: paymentResponse.razorpay_order_id,
        payment_signature: paymentResponse.razorpay_signature,
        payment_status: "paid" as const,
        payment_method: "razorpay",
        currency: "INR",
      };

      console.log("📦 Creating order with data:", {
        userId: user.id,
        cartItems: cartItems.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.product?.price,
        })),
        paymentData,
      });

      const order = await ordersService.createOrder(
        user.id,
        cartItems,
        paymentData,
        99 // Default shipping charge
      );

      try {
        await clearCart();
      } catch (error) {
        console.error("Error clearing cart:", error);
        // Don't show error to user as order was already created successfully
      }

      showSuccess(
        "Order Placed Successfully!",
        `Order ID: ${order.id}\nOrder Number: ${
          order.order_number
        }\nPayment ID: ${
          paymentResponse.razorpay_payment_id
        }\nTotal: $${order.total.toFixed(2)}\n\nCustomer: ${
          user.user_metadata?.full_name || user.email
        }`,
        10000
      );

      // Refresh the page to show updated cart
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("❌ Error processing successful payment:", error);

      // Check if it's a duplicate order error
      if (error instanceof Error && error.message.includes("already exists")) {
        showWarning(
          "Order Already Exists",
          "This usually happens when the payment was processed but the order creation was attempted multiple times. Please check your order history or contact support if you don't see your order.",
          10000
        );
      } else {
        showError(
          "Order Creation Failed",
          `Payment successful but order creation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }. Please contact support.`,
          10000
        );
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePaymentError = (error: Error) => {
    console.error("Payment error:", error);
    showError("Payment Failed", error.message);
    setPlacingOrder(false);
  };

  const handlePaymentInitiation = async () => {
    // Open checkout modal instead of checking addresses directly
    setShowCheckoutModal(true);
  };

  if (loading) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A5C3D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  // Show different messages based on authentication status
  if (!user) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-6" />
            <h1 className="text-3xl font-bold text-[#4A5C3D] mb-4">
              Sign In to View Your Cart
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Please sign in to view your cart and manage your items.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  // This will trigger the Google sign-in
                  window.location.href = "/";
                }}
                className="inline-flex items-center px-6 py-3 bg-[#4A5C3D] text-white rounded-lg font-semibold hover:bg-[#3a4a2f] transition-colors duration-200"
              >
                Sign In with Google
              </button>
              <Link
                to="/shop"
                className="inline-flex items-center px-6 py-3 border-2 border-[#4A5C3D] text-[#4A5C3D] rounded-lg font-semibold hover:bg-[#4A5C3D] hover:text-white transition-colors duration-200"
              >
                <ArrowLeft size={20} className="mr-2" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-6" />
            <h1 className="text-3xl font-bold text-[#4A5C3D] mb-4">
              Your Cart is Empty
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center px-6 py-3 bg-[#4A5C3D] text-white rounded-lg font-semibold hover:bg-[#3a4a2f] transition-colors duration-200"
            >
              <ArrowLeft size={20} className="mr-2" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#4A5C3D]">
            Shopping Cart
          </h1>
          <Link
            to="/shop"
            className="inline-flex items-center text-[#4A5C3D] hover:text-[#3a4a2f] transition-colors text-sm sm:text-base"
          >
            <ArrowLeft size={18} className="mr-2" />
            Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {cartItems.map((item) => {
              console.log("Cart item:", item);
              return (
                <div
                  key={`${item.id}-${item.product_id}`}
                  className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      {item.product?.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#E6D9C5] rounded-lg flex items-center justify-center">
                          <ShoppingBag
                            size={20}
                            className="sm:w-6 sm:h-6 text-[#4A5C3D]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg sm:text-xl font-semibold text-[#4A5C3D] mb-2">
                        {item.product?.name || "Product"}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                        <span className="bg-[#E6D9C5] px-2 sm:px-3 py-1 rounded-full font-medium text-xs sm:text-sm text-center inline-block">
                          {item.product?.weight}g pack
                        </span>
                        <span className="text-base sm:text-lg font-bold text-[#A88B67]">
                          ₹{item.product?.price?.toFixed(2) || "0.00"} each
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                          onClick={async () => {
                            console.log("🔴 MINUS BUTTON CLICKED!");
                            console.log("Item details:", {
                              id: item.id,
                              quantity: item.quantity,
                              product_id: item.product_id,
                            });
                            const newQuantity = item.quantity - 1;
                            console.log(
                              "Decreasing quantity for item:",
                              item.id,
                              "from",
                              item.quantity,
                              "to",
                              newQuantity
                            );
                            try {
                              console.log("🔍 Updating quantity for item:", {
                                cartItemId: item.id,
                                productId: item.product_id,
                                currentQuantity: item.quantity,
                                newQuantity: newQuantity,
                              });
                              await updateQty(item.id, newQuantity);
                              console.log("✅ Quantity updated successfully");
                            } catch (error) {
                              console.error(
                                "❌ Error updating quantity:",
                                error
                              );
                              showError(
                                "Update Failed",
                                `Failed to update quantity: ${
                                  error instanceof Error
                                    ? error.message
                                    : "Unknown error"
                                }`
                              );
                            }
                          }}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#4A5C3D] flex items-center justify-center text-[#4A5C3D] hover:bg-[#4A5C3D] hover:text-white transition-colors"
                        >
                          <Minus size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <span className="text-lg sm:text-xl font-semibold text-[#4A5C3D] w-6 sm:w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={async () => {
                            console.log("🔴 PLUS BUTTON CLICKED!");
                            console.log("Item details:", {
                              id: item.id,
                              quantity: item.quantity,
                              product_id: item.product_id,
                            });
                            console.log(
                              "Increasing quantity for item:",
                              item.id,
                              "from",
                              item.quantity,
                              "to",
                              item.quantity + 1
                            );
                            try {
                              console.log("🔍 Updating quantity for item:", {
                                cartItemId: item.id,
                                productId: item.product_id,
                                currentQuantity: item.quantity,
                                newQuantity: item.quantity + 1,
                              });
                              await updateQty(item.id, item.quantity + 1);
                              console.log("✅ Quantity updated successfully");
                            } catch (error) {
                              console.error(
                                "❌ Error updating quantity:",
                                error
                              );
                              showError(
                                "Update Failed",
                                `Failed to update quantity: ${
                                  error instanceof Error
                                    ? error.message
                                    : "Unknown error"
                                }`
                              );
                            }
                          }}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#4A5C3D] flex items-center justify-center text-[#4A5C3D] hover:bg-[#4A5C3D] hover:text-white transition-colors"
                        >
                          <Plus size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-center sm:text-right min-w-[80px] sm:min-w-[100px]">
                        <div className="text-base sm:text-lg font-bold text-[#4A5C3D]">
                          ₹
                          {getSubtotal(
                            item.product?.price || 0,
                            item.quantity
                          ).toFixed(2)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          ₹{item.product?.price?.toFixed(2) || "0.00"} ×{" "}
                          {item.quantity}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={async () => {
                          try {
                            await removeItem(item.id);
                          } catch (error) {
                            showError(
                              "Remove Failed",
                              "Failed to remove item. Please try again."
                            );
                          }
                        }}
                        className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={16} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 sticky top-24">
              <h2 className="text-xl sm:text-2xl font-bold text-[#4A5C3D] mb-4 sm:mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex justify-between text-base sm:text-lg">
                  <span className="text-gray-700">Items ({totalItems})</span>
                  <span className="font-semibold text-[#4A5C3D]">
                    ₹{totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="flex justify-between text-lg sm:text-xl font-bold">
                    <span className="text-[#4A5C3D]">Total</span>
                    <span className="text-[#A88B67]">
                      ₹{totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                <p>✓ 30-day money-back guarantee</p>
                <p>✓ Secure checkout</p>
              </div>

              {/* Payment Options */}
              <div className="space-y-4">
                {/* Custom Payment Button with Address Validation */}
                <button
                  onClick={handlePaymentInitiation}
                  disabled={placingOrder || checkingAddress}
                  className="w-full bg-[#4A5C3D] text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:bg-[#3a4a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-base sm:text-lg shadow-lg hover:shadow-xl"
                >
                  {placingOrder ? (
                    <span>Processing Order...</span>
                  ) : checkingAddress ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Checking Address...</span>
                    </>
                  ) : (
                    <span>Go to Checkout - ₹{totalPrice.toFixed(2)}</span>
                  )}
                </button>
              </div>

              {/* Continue Shopping */}
              <div className="mt-6">
                <Link
                  to="/shop"
                  className="block w-full text-center py-3 border-2 border-[#4A5C3D] text-[#4A5C3D] rounded-lg font-semibold hover:bg-[#4A5C3D] hover:text-white transition-colors duration-200"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Confirmation Dialog */}
      {showAddressDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-[#4A5C3D]">
                  Select Delivery Address
                </h3>
                <button
                  onClick={() => setShowAddressDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {userAddresses.map((address) => (
                  <div
                    key={address.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAddress?.id === address.id
                        ? "border-[#4A5C3D] bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleAddressSelection(address)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {address.name}
                          </h4>
                          {address.is_default && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>{address.address_line_1}</p>
                          {address.address_line_2 && (
                            <p>{address.address_line_2}</p>
                          )}
                          <p>
                            {address.city}, {address.state}{" "}
                            {address.postal_code}
                          </p>
                          <p>{address.country}</p>
                          <p className="font-medium">{address.phone}</p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            selectedAddress?.id === address.id
                              ? "border-[#4A5C3D] bg-[#4A5C3D]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedAddress?.id === address.id && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3">
                <Link
                  to="/checkout"
                  className="flex-1 bg-[#4A5C3D] text-white py-2 rounded-lg hover:bg-[#3a4a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
                >
                  Go to Checkout
                </Link>
                <button
                  onClick={() => setShowAddressDialog(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 text-center">
                <Link
                  to="/settings?tab=addresses"
                  className="text-[#4A5C3D] hover:text-[#3a4a2f] text-sm"
                >
                  Manage Addresses
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Confirmation Modal */}
      <ConfirmationModal
        isOpen={showAddressConfirmModal}
        onClose={() => setShowAddressConfirmModal(false)}
        onConfirm={handleAddressConfirm}
        title="No Delivery Address Found"
        message="You need to add a delivery address before placing an order. Would you like to add an address now?"
        confirmText="Add Address"
        cancelText="Cancel"
        type="warning"
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
      />
    </div>
  );
};

export default Cart;
