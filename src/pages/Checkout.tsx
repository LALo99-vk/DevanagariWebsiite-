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
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
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
          body: JSON.stringify({ code: promoCode }),
        }
      );

      const data = await response.json();

      if (data.valid) {
        setPromoApplied(true);
        setPromoDiscount(Math.round(subtotal * (data.discount / 100)));
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
      // First create a Razorpay order
      const order = await razorpayService.createOrder({
        amount: total * 100, // Convert to paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          items: JSON.stringify(cartItems),
          shipping_address: JSON.stringify(shippingAddress),
          promo_code: promoApplied ? promoCode : null,
          discount: discount,
          shipping: shipping,
        },
      });

      // Then open payment modal
      await razorpayService.openPaymentModal(
        order,
        user.email,
        user.user_metadata?.full_name || user.email,
        user.user_metadata?.phone,
        (response) => {
          showSuccess(
            "Payment Successful",
            "Your order has been placed successfully!"
          );
          clearCart();
          navigate("/orders");
        },
        (error) => {
          showError("Payment Failed", error.message);
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
      <div className="bg-[#FDFBF8] pt-16 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A5C3D]"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="px-4 py-8 mx-auto max-w-6xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton />
          <h1 className="text-3xl font-bold text-[#4A5C3D] mt-4">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-4 flex items-center">
                <MapPin className="mr-2" size={20} />
                Shipping Address
              </h2>
              <AddressManagement
                onAddressSelect={setShippingAddress}
                selectedAddress={shippingAddress}
              />
            </div>

            {/* Promo Code */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-4 flex items-center">
                <Tag className="mr-2" size={20} />
                Promo Code
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A5C3D] focus:border-transparent"
                  disabled={promoApplied}
                />
                <button
                  onClick={handlePromoCode}
                  disabled={promoApplied || !promoCode.trim()}
                  className="px-6 py-2 bg-[#4A5C3D] text-white rounded-lg hover:bg-[#3a4a2f] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {promoApplied ? "Applied" : "Apply"}
                </button>
              </div>
              {promoApplied && (
                <p className="text-green-600 text-sm mt-2">
                  ✓ 10% discount applied!
                </p>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-4">
                Order Items
              </h2>
              <div className="space-y-4">
                {cartItems?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-[#4A5C3D]">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-6">
                Order Summary
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>

                {promoApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount (10%)</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center">
                    <Truck className="mr-1" size={16} />
                    Shipping
                    {isFreeDelivery && (
                      <span className="ml-2 text-green-600 text-sm">
                        (Free for Davangere)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {isFreeDelivery ? "Free" : `₹${shipping}`}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-bold text-[#4A5C3D]">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={!shippingAddress || loading}
                className="w-full mt-6 bg-[#4A5C3D] text-white py-4 rounded-lg font-semibold hover:bg-[#3a4a2f] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                <CreditCard size={20} />
                <span>
                  {loading ? "Processing..." : `Pay ₹${total.toFixed(2)}`}
                </span>
              </button>

              {!shippingAddress && (
                <p className="text-red-500 text-sm mt-2 text-center">
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
