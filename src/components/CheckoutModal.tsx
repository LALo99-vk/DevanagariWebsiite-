import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ChevronDown,
  Tag,
  MapPin,
  CreditCard,
  Check,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { addressService, UserAddress } from "../services/supabase";
import { supabase } from "../lib/supabaseClient";
import razorpayService from "../services/razorpay";
import logo from "../assets/sreeshivanilogo.png";
import placeholderImg from "../assets/shop/ingredients.png";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface AddressFormData {
  name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { items: cartItems, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();

  // Modal state
  const [currentStep, setCurrentStep] = useState(1);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    name: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
    is_default: false,
  });

  // Free delivery pincodes
  const freeDeliveryPincodes = [
    "577001",
    "577002",
    "577003",
    "577004",
    "577005",
    "577006",
    "577008",
  ];

  // Calculate totals
  const subtotal = totalPrice;
  const isFreeDelivery =
    selectedAddress &&
    freeDeliveryPincodes.includes(selectedAddress.postal_code);
  const shipping = isFreeDelivery ? 0 : 99;
  const discount = promoApplied ? promoDiscount : 0;
  const total = subtotal + shipping - discount;

  // Fetch available offers from database
  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const offers = (data || []).map((promo) => ({
        code: promo.code,
        discount: promo.discount_value,
        type: promo.discount_type,
        description: promo.description,
        minOrder: promo.min_order_amount,
        applicable: subtotal >= promo.min_order_amount,
      }));

      setAvailableOffers(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      // Fallback to empty array if fetch fails
      setAvailableOffers([]);
    }
  };

  // Calculate offers based on current subtotal
  const offers = useMemo(() => {
    return availableOffers.map((offer) => ({
      ...offer,
      applicable: subtotal >= offer.minOrder,
    }));
  }, [availableOffers, subtotal]);

  // Load addresses and offers when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchAddresses();
      fetchOffers();
    }
  }, [isOpen, user]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on the body
      document.body.style.overflow = "hidden";
    } else {
      // Restore scrolling when modal is closed
      document.body.style.overflow = "unset";
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const fetchAddresses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userAddresses = await addressService.getUserAddresses(user.id);
      setAddresses(userAddresses);

      // Auto-select default address if available
      const defaultAddress = userAddresses.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
      showError("Error", "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

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
        // Use the discount amount calculated by the server
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

  const handleOfferSelect = (offer: any) => {
    if (offer.applicable) {
      setPromoCode(offer.code);
      setShowOffersModal(false);
    } else {
      showError(
        "Not Applicable",
        `This offer requires a minimum order of ₹${
          offer.minOrder
        }. Your current order is ₹${subtotal.toFixed(2)}`
      );
    }
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (!selectedAddress) {
        showError("Address Required", "Please select a shipping address");
        return;
      }
      setCurrentStep(2);
    }
  };

  const handlePayment = async () => {
    if (!selectedAddress) {
      showError("Address Required", "Please select a shipping address");
      return;
    }

    if (!user?.email) {
      showError("Authentication Required", "Please sign in to make a payment");
      return;
    }

    setPaymentLoading(true);
    try {
      // The server prices the cart itself; we only send what is being bought.
      const order = await razorpayService.createOrder(
        cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        selectedAddress.id,
        promoApplied ? promoCode : null
      );

      // Open payment modal
      await razorpayService.openPaymentModal(
        order,
        user.email,
        user.user_metadata?.full_name || user.email,
        user.user_metadata?.phone,
        async (response) => {
          try {
            // The server verifies the payment and saves the order.
            const result = await razorpayService.verifyPayment(response);
            if (!result.isValid || !result.order) {
              throw new Error(result.error || "Payment verification failed");
            }

            clearCart();
            onClose();
            try {
              sessionStorage.setItem(
                "orderSuccess",
                JSON.stringify({ id: result.order.id, amount: result.order.total })
              );
            } catch {}
            setTimeout(() => {
              window.location.href = "/profile";
            }, 800);
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
          showError("Payment Failed", error.message);
        }
      );
    } catch (error) {
      console.error("Payment error:", error);
      showError(
        "Payment Error",
        error instanceof Error
          ? error.message
          : "Failed to initiate payment. Please try again."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingAddress) {
        await addressService.updateAddress(editingAddress.id, addressFormData);
        showSuccess("Address Updated", "Address updated successfully!");
      } else {
        await addressService.createAddress(user.id, addressFormData);
        showSuccess("Address Added", "Address added successfully!");
      }
      await fetchAddresses();
      resetAddressForm();
    } catch (error) {
      console.error("Error saving address:", error);
      showError("Save Failed", "Failed to save address. Please try again.");
    }
  };

  const handleEditAddress = (address: UserAddress) => {
    setEditingAddress(address);
    setAddressFormData({
      name: address.name,
      phone: address.phone,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || "",
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    });
    setShowAddressForm(true);
  };

  const handleDeleteAddress = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteModal(true);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;

    try {
      await addressService.deleteAddress(addressToDelete);
      await fetchAddresses();

      // If the deleted address was selected, clear selection
      if (selectedAddress?.id === addressToDelete) {
        setSelectedAddress(null);
      }

      showSuccess("Address Deleted", "Address deleted successfully!");
    } catch (error) {
      console.error("Error deleting address:", error);
      showError("Delete Failed", "Failed to delete address. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setAddressToDelete(null);
    }
  };

  const resetAddressForm = () => {
    setAddressFormData({
      name: "",
      phone: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "India",
      is_default: false,
    });
    setEditingAddress(null);
    setShowAddressForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-emerald-900 rounded-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gold-400/20">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img src={logo} alt="Logo" className="h-6 w-6 sm:h-8 sm:w-8" />
            <h2 className="text-lg sm:text-xl font-display font-semibold text-cream">
              Devanagari
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-mist/80 hover:text-mist transition-colors p-1"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gold-400/20">
          <div className="flex items-center justify-center space-x-4 sm:space-x-8">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${
                  currentStep >= 1
                    ? "bg-gold-400 text-emerald-950"
                    : "bg-emerald-800 text-mist"
                }`}
              >
                {currentStep > 1 ? (
                  <Check size={12} className="sm:w-4 sm:h-4" />
                ) : (
                  "1"
                )}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium ${
                  currentStep >= 1 ? "text-cream" : "text-mist"
                }`}
              >
                Address
              </span>
            </div>
            <div className="w-4 sm:w-8 h-0.5 bg-emerald-800"></div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${
                  currentStep >= 2
                    ? "bg-gold-400 text-emerald-950"
                    : "bg-emerald-800 text-mist"
                }`}
              >
                {currentStep > 2 ? (
                  <Check size={12} className="sm:w-4 sm:h-4" />
                ) : (
                  "2"
                )}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium ${
                  currentStep >= 2 ? "text-cream" : "text-mist"
                }`}
              >
                Pay
              </span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gold-400/20">
          <button
            onClick={() => setIsOrderSummaryOpen(!isOrderSummaryOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-semibold text-cream text-sm sm:text-base">
              Order Summary
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform sm:w-5 sm:h-5 ${
                isOrderSummaryOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {isOrderSummaryOpen && (
            <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
              {/* Product Details */}
              <div className="space-y-2 sm:space-y-3">
                <h4 className="font-semibold text-cream text-xs sm:text-sm">
                  Items in your order:
                </h4>
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-emerald-950/50 rounded-lg"
                  >
                    <img
                      src={
                        (typeof item.product?.image_url === "string" &&
                          /^https?:\/\//i.test(item.product.image_url) &&
                          item.product.image_url) ||
                        placeholderImg
                      }
                      alt={item.product?.name || "Product"}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-xs sm:text-sm text-cream truncate">
                        {item.product?.name || "Product"}
                      </h5>
                      <p className="text-xs text-mist">
                        {item.product?.weight}g pack × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-xs sm:text-sm">
                        ₹
                        {((item.product?.price || 0) * item.quantity).toFixed(
                          2
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 border-t border-gold-400/20 pt-3">
                <div className="flex justify-between">
                  <span className="text-mist">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-emerald-300">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-mist">Shipping</span>
                  <span className="font-semibold">
                    {isFreeDelivery ? "Free" : `₹${shipping}`}
                  </span>
                </div>
                <div className="border-t border-gold-400/20 pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 1: Address Selection */}
        {currentStep === 1 && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Welcome Message */}
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-display font-semibold text-cream truncate">
                  Hey! Welcome back{" "}
                  {user?.user_metadata?.full_name?.split(" ")[0] ||
                    user?.user_metadata?.name?.split(" ")[0] ||
                    user?.email?.split("@")[0] ||
                    "Customer"}
                </h3>
              </div>
              <button className="text-cream text-xs sm:text-sm font-medium ml-2 flex-shrink-0">
                Edit
              </button>
            </div>

            {/* Promo Code Section */}
            <div className="bg-emerald-950/60 border border-gold-400/20 rounded-lg p-3 sm:p-4">
              <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                <Tag className="text-cream" size={16} />
                <span className="font-semibold text-cream text-xs sm:text-sm">
                  Coupon code
                </span>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                  disabled={promoApplied}
                />
                <button
                  onClick={handlePromoCode}
                  disabled={promoApplied || !promoCode.trim()}
                  className="px-3 sm:px-4 py-2 bg-gold-400 text-emerald-950 text-sm rounded-full hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {promoApplied ? "Applied" : "Apply"}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 space-y-1 sm:space-y-0">
                <span className="text-xs sm:text-sm text-mist">
                  {offers.length} coupons available
                </span>
                <button
                  onClick={() => setShowOffersModal(true)}
                  className="text-cream text-xs sm:text-sm font-medium hover:underline text-left sm:text-right"
                >
                  View Coupons →
                </button>
              </div>
            </div>

            {/* Shipping Address Section */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-display font-semibold text-cream">
                  Shipping Address
                </h3>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="text-cream text-xs sm:text-sm font-medium flex-shrink-0"
                >
                  + Add address
                </button>
              </div>

              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-gold-400 mx-auto mb-3 sm:mb-4"></div>
                  <p className="text-mist text-sm sm:text-base">
                    Loading addresses...
                  </p>
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6 sm:py-8 bg-emerald-950/50 rounded-lg">
                  <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-mist/80 mx-auto mb-3 sm:mb-4" />
                  <p className="text-mist mb-3 sm:mb-4 text-sm sm:text-base">
                    No addresses found
                  </p>
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="text-cream text-xs sm:text-sm font-medium"
                  >
                    Add your first address
                  </button>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAddress?.id === address.id
                          ? "border-gold-400 bg-gold-400/10"
                          : "border-gold-400/20 hover:border-gold-400/40"
                      }`}
                      onClick={() => setSelectedAddress(address)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <div
                              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex-shrink-0 ${
                                selectedAddress?.id === address.id
                                  ? "border-gold-400 bg-gold-400"
                                  : "border-gold-400/30"
                              }`}
                            >
                              {selectedAddress?.id === address.id && (
                                <div className="w-full h-full rounded-full bg-emerald-900 scale-50"></div>
                              )}
                            </div>
                            <h4 className="font-semibold text-cream text-sm sm:text-base truncate">
                              {address.name}
                            </h4>
                          </div>
                          <div className="text-xs sm:text-sm text-mist space-y-1">
                            <p className="break-words">
                              {address.address_line_1}
                            </p>
                            {address.address_line_2 && (
                              <p className="break-words">
                                {address.address_line_2}
                              </p>
                            )}
                            <p>
                              {address.city}, {address.state}{" "}
                              {address.postal_code}
                            </p>
                            <p>{address.country}</p>
                            <p className="font-medium">{address.phone}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 ml-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddress(address);
                            }}
                            className="text-cream text-xs sm:text-sm font-medium hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                            className="text-[#F0A08C] text-xs sm:text-sm font-medium hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!selectedAddress}
              className="w-full bg-gold-400 text-emerald-950 py-3 sm:py-4 rounded-full font-semibold hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <span>Continue</span>
              <ArrowRight size={16} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Payment */}
        {currentStep === 2 && (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-display font-semibold text-cream mb-2">
                Payment Details
              </h3>
              <p className="text-mist text-sm sm:text-base">
                Complete your order with secure payment
              </p>
            </div>

            {/* Order Summary for Payment Step */}
            <div className="bg-emerald-950/50 rounded-lg p-3 sm:p-4">
              <h4 className="font-semibold text-cream mb-2 sm:mb-3 text-sm sm:text-base">
                Order Summary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-mist">
                    Items ({cartItems.length})
                  </span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-emerald-300 text-sm sm:text-base">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-mist">Shipping</span>
                  <span className="font-semibold">
                    {isFreeDelivery ? "Free" : `₹${shipping}`}
                  </span>
                </div>
                <div className="border-t border-gold-400/20 pt-2">
                  <div className="flex justify-between font-bold text-base sm:text-lg">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Address */}
            {selectedAddress && (
              <div className="bg-gold-400/10 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-cream mb-2 text-sm sm:text-base">
                  Delivery Address
                </h4>
                <div className="text-xs sm:text-sm text-mist space-y-1">
                  <p className="font-medium">{selectedAddress.name}</p>
                  <p className="break-words">
                    {selectedAddress.address_line_1}
                  </p>
                  {selectedAddress.address_line_2 && (
                    <p className="break-words">
                      {selectedAddress.address_line_2}
                    </p>
                  )}
                  <p>
                    {selectedAddress.city}, {selectedAddress.state}{" "}
                    {selectedAddress.postal_code}
                  </p>
                  <p>{selectedAddress.country}</p>
                  <p className="font-medium">{selectedAddress.phone}</p>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full bg-gold-400 text-emerald-950 py-3 sm:py-4 rounded-full font-semibold hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              {paymentLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-emerald-950"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} className="sm:w-5 sm:h-5" />
                  <span>Pay ₹{total.toFixed(2)}</span>
                </>
              )}
            </button>

            {/* Back Button */}
            <button
              onClick={() => setCurrentStep(1)}
              className="w-full text-cream py-2 font-medium hover:bg-gold-400/5 rounded-lg transition-colors text-sm sm:text-base"
            >
              ← Back to Address
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gold-400/20 bg-emerald-950/50">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-mist space-y-2 sm:space-y-0">
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPolicyModal(true)}
                className="hover:text-gold-200 transition-colors"
              >
                Terms and Policies
              </button>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
              <span>PCI DSS Certified</span>
              <span>100% Secured Payments</span>
              <span>Verified Merchant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offers Modal */}
      {showOffersModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-60">
          <div className="bg-emerald-900 rounded-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] max-w-md w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-display font-semibold text-cream">
                  Available Offers
                </h3>
                <button
                  onClick={() => setShowOffersModal(false)}
                  className="text-mist/80 hover:text-mist transition-colors p-1"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {offers.map((offer, index) => (
                  <div
                    key={index}
                    onClick={() => handleOfferSelect(offer)}
                    className={`border rounded-lg p-3 sm:p-4 transition-colors cursor-pointer ${
                      offer.applicable
                        ? "border-gold-400/20 hover:border-gold-400/60 hover:bg-gold-400/10"
                        : "border-gold-400/20 bg-emerald-950/50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className={`font-semibold text-sm sm:text-base ${
                          offer.applicable ? "text-cream" : "text-mist"
                        }`}
                      >
                        {offer.code}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {offer.applicable ? (
                          <span className="bg-emerald-300/15 text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">
                            {offer.type === "shipping"
                              ? "FREE SHIPPING"
                              : `${offer.discount}% OFF`}
                          </span>
                        ) : (
                          <span className="bg-[#F0A08C]/15 text-[#F0A08C] px-2 py-1 rounded-full text-xs font-medium">
                            NOT APPLICABLE
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-xs sm:text-sm mb-2 ${
                        offer.applicable ? "text-mist" : "text-mist"
                      }`}
                    >
                      {offer.description}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <p
                        className={`text-xs ${
                          offer.applicable ? "text-mist" : "text-[#F0A08C]"
                        }`}
                      >
                        {offer.applicable
                          ? offer.minOrder > 0
                            ? `Minimum order: ₹${offer.minOrder}`
                            : "No minimum order required"
                          : `Requires minimum order of ₹${offer.minOrder}`}
                      </p>
                      {offer.applicable && (
                        <span className="text-xs text-cream font-medium">
                          Click to apply →
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gold-400/20">
                <button
                  onClick={() => setShowOffersModal(false)}
                  className="w-full bg-gold-400 text-emerald-950 py-2 sm:py-3 rounded-full font-semibold hover:bg-gold-300 transition-colors text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-60">
          <div className="bg-emerald-900 rounded-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] max-w-md w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-display font-semibold text-cream">
                  Policies & Terms
                </h3>
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="text-mist/80 hover:text-mist transition-colors p-1"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Terms and Conditions */}
                <div className="border border-gold-400/20 rounded-lg p-3 sm:p-4 hover:border-gold-400/60 transition-colors">
                  <a
                    href="https://merchant.razorpay.com/policy/RHjsekRLxMzas4/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h4 className="font-semibold text-cream mb-2 text-sm sm:text-base">
                      Terms and Conditions
                    </h4>
                    <p className="text-xs sm:text-sm text-mist mb-2">
                      Read our terms of service and user agreement
                    </p>
                    <span className="text-xs text-cream font-medium">
                      View Terms →
                    </span>
                  </a>
                </div>

                {/* Cancellation and Refund Policy */}
                <div className="border border-gold-400/20 rounded-lg p-3 sm:p-4 hover:border-gold-400/60 transition-colors">
                  <a
                    href="https://merchant.razorpay.com/policy/RHjsekRLxMzas4/refund"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h4 className="font-semibold text-cream mb-2 text-sm sm:text-base">
                      Cancellation and Refund Policy
                    </h4>
                    <p className="text-xs sm:text-sm text-mist mb-2">
                      Learn about our refund and cancellation policies
                    </p>
                    <span className="text-xs text-cream font-medium">
                      View Policy →
                    </span>
                  </a>
                </div>

                {/* Shipping and Delivery Policy */}
                <div className="border border-gold-400/20 rounded-lg p-3 sm:p-4 hover:border-gold-400/60 transition-colors">
                  <a
                    href="https://merchant.razorpay.com/policy/RHjsekRLxMzas4/shipping"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h4 className="font-semibold text-cream mb-2 text-sm sm:text-base">
                      Shipping and Delivery Policy
                    </h4>
                    <p className="text-xs sm:text-sm text-mist mb-2">
                      Information about shipping, delivery times, and charges
                    </p>
                    <span className="text-xs text-cream font-medium">
                      View Policy →
                    </span>
                  </a>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gold-400/20">
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="w-full bg-gold-400 text-emerald-950 py-2 sm:py-3 rounded-full font-semibold hover:bg-gold-300 transition-colors text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Form Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-60">
          <div className="bg-emerald-900 rounded-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-display font-semibold text-cream">
                  {editingAddress ? "Edit Address" : "Add New Address"}
                </h3>
                <button
                  onClick={resetAddressForm}
                  className="text-mist/80 hover:text-mist p-1"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <form
                onSubmit={handleAddressSubmit}
                className="space-y-3 sm:space-y-4"
              >
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.name}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressFormData.phone}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressFormData.address_line_1}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        address_line_1: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                    placeholder="Street address, P.O. box, etc."
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={addressFormData.address_line_2}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        address_line_2: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                    placeholder="Apartment, suite, unit, building, floor, etc."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressFormData.city}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          city: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressFormData.state}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          state: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={addressFormData.postal_code}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          postal_code: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-cream mb-1">
                      Country *
                    </label>
                    <select
                      required
                      value={addressFormData.country}
                      onChange={(e) =>
                        setAddressFormData({
                          ...addressFormData,
                          country: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gold-400/30 rounded-lg focus:ring-2 focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 focus:border-transparent"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={addressFormData.is_default}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        is_default: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-cream focus:ring-gold-400 bg-emerald-950 text-cream placeholder:text-mist/60 border-gold-400/30 rounded"
                  />
                  <label
                    htmlFor="is_default"
                    className="ml-2 text-xs sm:text-sm text-cream"
                  >
                    Set as default address
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="flex-1 px-3 sm:px-4 py-2 border border-gold-400/30 text-cream text-sm rounded-lg hover:bg-gold-400/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 sm:px-4 py-2 bg-gold-400 text-emerald-950 text-sm rounded-full hover:bg-gold-300 transition-colors flex items-center justify-center gap-x-2"
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    {editingAddress ? "Update Address" : "Add Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-70">
          <div className="bg-emerald-900 rounded-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] max-w-md w-full">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[#F0A08C]">
                  Delete Address
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-mist/80 hover:text-mist p-1"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <p className="text-mist mb-4 sm:mb-6 text-sm sm:text-base">
                Are you sure you want to delete this address? This action cannot
                be undone.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-gold-400/30 text-cream text-sm rounded-lg hover:bg-gold-400/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAddress}
                  className="flex-1 px-3 sm:px-4 py-2 bg-[#F0A08C] text-emerald-950 text-sm rounded-lg hover:bg-[#F4B5A4] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutModal;
