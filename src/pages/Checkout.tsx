import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Tag, Truck, MapPin } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import razorpayService from "../services/razorpay";
import AddressManagement from "../components/AddressManagement";
import BackButton from "../components/BackButton";

const Checkout = () => {
  const { items: cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Davangere pincodes for free delivery
  const freeDeliveryPincodes = [
    "577001",
    "577002",
    "577003",
    "577004",
    "577005",
    "577006",
    "577008",
  ];
  const shippingCharge = 99;

  // Calculate totals
  const subtotal =
    cartItems?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const isFreeDelivery =
    shippingAddress && freeDeliveryPincodes.includes(shippingAddress.pincode);
  const shipping = isFreeDelivery ? 0 : shippingCharge;
  const discount = promoApplied ? promoDiscount : 0;
  const total = subtotal + shipping - discount;

  useEffect(() => {
    if (cartItems && cartItems.length === 0) {
      navigate("/cart");
    }
  }, [cartItems, navigate]);

  const handlePromoCode = async () => {
    if (!promoCode.trim()) {
      showError("Invalid Code", "Please enter a promo code");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/promo/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: promoCode,
            orderAmount: subtotal,
          }),
        }
      );

      const data = await response.json();

      if (data.valid) {
        setPromoApplied(true);
        setPromoDiscount(data.discountAmount || 0);
        showSuccess("Promo Applied", `${data.description}`);
      } else {
        showError(
          "Invalid Code",
          data.error || "The promo code you entered is not valid"
        );
      }
    } catch (error) {
      console.error("Promo code validation error:", error);
      showError("Error", "Failed to validate promo code. Please try again.");
    }
  };

  const handlePayment = async () => {
    if (!shippingAddress) {
      showError("Address Required", "Please select a shipping address");
      return;
    }

    if (!user?.email) {
      showError("Authentication Required", "Please sign in to make a payment");
      return;
    }

    setLoading(true);
    try {
      // The server prices the cart itself; we only send what is being bought.
      const order = await razorpayService.createOrder(
        cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        shippingAddress.id,
        promoApplied ? promoCode : null
      );

      // Then open payment modal
      await razorpayService.openPaymentModal(
        order,
        user.email,
        user.user_metadata?.full_name || user.email,
        // Google sign-ins carry no phone, so use the delivery address's number.
        shippingAddress.phone || user.user_metadata?.phone,
        async (response) => {
          try {
            // The server verifies the payment and saves the order.
            const result = await razorpayService.verifyPayment(response);
            if (!result.isValid || !result.order) {
              throw new Error(result.error || "Payment verification failed");
            }

            clearCart();
            try {
              sessionStorage.setItem(
                "orderSuccess",
                JSON.stringify({ id: result.order.id, amount: result.order.total })
              );
            } catch {}
            setTimeout(() => navigate("/profile"), 800);
          } catch (error) {
            console.error("❌ Error processing order:", error);
            showError(
              "Order Processing Error",
              error instanceof Error
                ? error.message
                : "Payment was successful but there was an error processing your order. Please contact support."
            );
          }
        },
        (error) => {
          showError(
            error.name === "PaymentCancelled" ? "Payment Cancelled" : "Payment Failed",
            error.message
          );
        }
      );
    } catch (error) {
      console.error("Payment error:", error);
      showError(
        "Payment Error",
        "Failed to initiate payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while cartItems is being loaded
  if (!cartItems) {
    return (
      <div className="bg-emerald-950 text-cream pt-24 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-emerald-950 text-cream pt-24 min-h-screen">
      <div className="px-4 py-8 mx-auto max-w-6xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton tone="dark" />
          <h1 className="font-display text-3xl font-display font-semibold text-cream mt-4">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <div className="bg-emerald-900 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-display font-semibold text-cream mb-4 flex items-center">
                <MapPin className="mr-2" size={20} />
                Shipping Address
              </h2>
              <AddressManagement
                onAddressSelect={setShippingAddress}
                selectedAddress={shippingAddress}
              />
            </div>

            {/* Promo Code */}
            <div className="bg-emerald-900 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-display font-semibold text-cream mb-4 flex items-center">
                <Tag className="mr-2" size={20} />
                Promo Code
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 px-4 py-2 border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                  disabled={promoApplied}
                />
                <button
                  onClick={handlePromoCode}
                  disabled={promoApplied || !promoCode.trim()}
                  className="px-6 py-2 bg-gold-400 text-emerald-950 rounded-full hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {promoApplied ? "Applied" : "Apply"}
                </button>
              </div>
              {promoApplied && (
                <p className="text-emerald-300 text-sm mt-2">
                  ✓ 10% discount applied!
                </p>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-emerald-900 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-display font-semibold text-cream mb-4">
                Order Items
              </h2>
              <div className="space-y-4">
                {cartItems?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gold-400/20"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div>
                        <h3 className="font-medium text-cream">
                          {item.name}
                        </h3>
                        <p className="text-sm text-mist">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-cream">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div className="bg-emerald-900 rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-display font-semibold text-cream mb-6">
                Order Summary
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-mist">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>

                {promoApplied && (
                  <div className="flex justify-between text-emerald-300">
                    <span>Discount (10%)</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-mist flex items-center">
                    <Truck className="mr-1" size={16} />
                    Shipping
                    {isFreeDelivery && (
                      <span className="ml-2 text-emerald-300 text-sm">
                        (Free for Davangere)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {isFreeDelivery ? "Free" : `₹${shipping}`}
                  </span>
                </div>

                <div className="border-t border-gold-400/20 pt-4">
                  <div className="flex justify-between text-lg font-bold text-cream">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={!shippingAddress || loading}
                className="w-full mt-6 bg-gold-400 text-emerald-950 py-4 rounded-full font-semibold hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <CreditCard size={20} />
                <span>
                  {loading ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
                </span>
              </button>

              {!shippingAddress && (
                <p className="text-[#F0A08C] text-sm mt-2 text-center">
                  Please select a shipping address to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
