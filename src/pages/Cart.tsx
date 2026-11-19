import { useState } from "react";
import placeholderImg from "../assets/shop/ingredients.png";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import CheckoutModal from "../components/CheckoutModal";

const Cart = () => {
  const {
    items: cartItems,
    updateQty,
    removeItem,
    totalItems,
    totalPrice,
    loading,
  } = useCart();
  const { user } = useAuth();
  const { showError } = useNotification();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const getSubtotal = (price: number, qty: number) => price * qty;

  const handlePaymentInitiation = async () => {
    // Open checkout modal instead of checking addresses directly
    setShowCheckoutModal(true);
  };

  if (loading) {
    return (
      <div className="bg-[#F6F0E4] pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14402E] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  // Show different messages based on authentication status
  if (!user) {
    return (
      <div className="bg-[#F6F0E4] pt-24 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-6" />
            <h1 className="font-display text-3xl font-bold text-[#14402E] mb-4">
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
                className="inline-flex items-center px-6 py-3 bg-[#14402E] text-white rounded-lg font-semibold hover:bg-[#0B2118] transition-colors duration-200"
              >
                Sign In with Google
              </button>
              <Link
                to="/shop"
                className="inline-flex items-center px-6 py-3 border-2 border-[#14402E] text-[#14402E] rounded-lg font-semibold hover:bg-[#14402E] hover:text-white transition-colors duration-200"
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
      <div className="bg-[#F6F0E4] pt-24 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-6" />
            <h1 className="font-display text-3xl font-bold text-[#14402E] mb-4">
              Your Cart is Empty
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center px-6 py-3 bg-[#14402E] text-white rounded-lg font-semibold hover:bg-[#0B2118] transition-colors duration-200"
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
    <div className="bg-[#F6F0E4] pt-24 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[#14402E]">
            Shopping Cart
          </h1>
          <Link
            to="/shop"
            className="inline-flex items-center text-[#14402E] hover:text-[#0B2118] transition-colors text-sm sm:text-base"
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
                      <img
                        src={
                          typeof item.product?.image_url === "string" &&
                          /^https?:\/\//i.test(item.product.image_url)
                            ? item.product.image_url
                            : placeholderImg
                        }
                        alt={item.product?.name || "Product"}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg sm:text-xl font-semibold text-[#14402E] mb-2">
                        {item.product?.name || "Product"}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600">
                        <span className="bg-[#ECE2CE] px-2 sm:px-3 py-1 rounded-full font-medium text-xs sm:text-sm text-center inline-block">
                          {item.product?.weight}g pack
                        </span>
                        <span className="text-base sm:text-lg font-bold text-[#A37C38]">
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
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#14402E] flex items-center justify-center text-[#14402E] hover:bg-[#14402E] hover:text-white transition-colors"
                        >
                          <Minus size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <span className="text-lg sm:text-xl font-semibold text-[#14402E] w-6 sm:w-8 text-center">
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
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#14402E] flex items-center justify-center text-[#14402E] hover:bg-[#14402E] hover:text-white transition-colors"
                        >
                          <Plus size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-center sm:text-right min-w-[80px] sm:min-w-[100px]">
                        <div className="text-base sm:text-lg font-bold text-[#14402E]">
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
              <h2 className="text-xl sm:text-2xl font-bold text-[#14402E] mb-4 sm:mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex justify-between text-base sm:text-lg">
                  <span className="text-gray-700">Items ({totalItems})</span>
                  <span className="font-semibold text-[#14402E]">
                    ₹{totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="flex justify-between text-lg sm:text-xl font-bold">
                    <span className="text-[#14402E]">Total</span>
                    <span className="text-[#A37C38]">
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
                  className="w-full bg-[#14402E] text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg hover:bg-[#0B2118] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-base sm:text-lg shadow-lg hover:shadow-xl"
                >
                  <span>Go to Checkout - ₹{totalPrice.toFixed(2)}</span>
                </button>
              </div>

              {/* Continue Shopping */}
              <div className="mt-6">
                <Link
                  to="/shop"
                  className="block w-full text-center py-3 border-2 border-[#14402E] text-[#14402E] rounded-lg font-semibold hover:bg-[#14402E] hover:text-white transition-colors duration-200"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
      />
    </div>
  );
};

export default Cart;
