import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { ordersService, Order, OrderItem } from "../services/supabase";
import { supabase } from "../lib/supabaseClient";
import AddressManagement from "../components/AddressManagement";
import BackButton from "../components/BackButton";

const Profile = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [orders, setOrders] = useState<
    (Order & { order_items: OrderItem[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        console.log("🔄 Fetching user orders...");
        console.log("User ID:", user.id);

        // Fetch orders from database
        const userOrders = await ordersService.getUserOrders(user.id);
        console.log("📦 Orders fetched:", userOrders.length);
        setOrders(userOrders);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        showError(
          "Order History Error",
          "Failed to load your order history. Please try again."
        );
        setOrders([]);
      } finally {
        console.log("🏁 Orders fetch completed - setting loading to false");
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const refreshOrders = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      console.log("🔄 Refreshing user orders...");
      const userOrders = await ordersService.getUserOrders(user.id);
      console.log("📦 Orders refreshed:", userOrders.length);
      setOrders(userOrders);
    } catch (error) {
      console.error("❌ Error refreshing orders:", error);
      showError(
        "Refresh Error",
        "Failed to refresh order history. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <BackButton text="Back to Home" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name || "User"}
                className="h-16 w-16 rounded-full border-2 border-[#4A5C3D] shadow-lg object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden"
                  );
                }}
              />
            ) : null}
            <div
              className={`h-16 w-16 rounded-full bg-gray-200 border-2 border-[#4A5C3D] flex items-center justify-center flex-shrink-0 ${
                user.user_metadata?.avatar_url ? "hidden" : ""
              }`}
            >
              <span className="text-2xl font-bold text-[#4A5C3D]">
                {(user.user_metadata?.full_name || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-[#4A5C3D] truncate">
                {user.user_metadata?.full_name || "User"}
              </div>
              <div className="text-base sm:text-lg text-gray-600 truncate">
                {user.email}
              </div>
            </div>
          </div>
          <div className="flex justify-end sm:justify-start">
            <Link
              to="/settings"
              className="bg-[#4A5C3D] text-white px-4 py-2 rounded-lg hover:bg-[#3a4a2f] transition-colors flex items-center space-x-2 text-sm sm:text-base"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Profile Information Card */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 border border-gray-100 mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#4A5C3D] mb-4">
            Profile Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="text-base sm:text-lg text-[#4A5C3D] font-medium truncate">
                {user.user_metadata?.full_name || "Not provided"}
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="text-base sm:text-lg text-[#4A5C3D] font-medium truncate">
                {user.email || "Not provided"}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-500">
              <span className="font-medium">Note:</span> Your profile
              information is automatically synced from your account. To update
              your name or photo, please change it in your account settings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Order History */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-semibold text-[#4A5C3D]">
                Order History
              </h2>
              <button
                onClick={refreshOrders}
                disabled={refreshing || loading}
                className="text-[#4A5C3D] hover:text-[#3a4a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4A5C3D]"></div>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A5C3D] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No orders yet</p>
                <a
                  href="/shop"
                  className="inline-block bg-[#4A5C3D] text-white px-4 py-2 rounded-lg hover:bg-[#3a4a2f] transition-colors"
                >
                  Start Shopping
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#4A5C3D] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-[#4A5C3D]">
                          Order #{order.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        {order.payment_id && (
                          <p className="text-xs text-gray-500">
                            Payment ID: {order.payment_id.slice(0, 20)}...
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[#4A5C3D]">
                          ₹{order.total.toFixed(2)} {order.currency || "INR"}
                        </div>
                        <div className="flex space-x-1 mt-1">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.status === "processing"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "shipped"
                                ? "bg-purple-100 text-purple-800"
                                : order.status === "delivered"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.status.charAt(0).toUpperCase() +
                              order.status.slice(1)}
                          </span>
                          {order.payment_status && (
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                order.payment_status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : order.payment_status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {order.payment_status.charAt(0).toUpperCase() +
                                order.payment_status.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span>Order Total</span>
                        <span>
                          ₹{order.total.toFixed(2)} {order.currency || "INR"}
                        </span>
                      </div>
                      {order.order_items && order.order_items.length > 0 ? (
                        order.order_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {item.product_name ||
                                item.product?.name ||
                                "Product"}{" "}
                              × {item.quantity}
                            </span>
                            <span>
                              ₹{item.product_price.toFixed(2)}{" "}
                              {order.currency || "INR"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500">
                          Order items not loaded (simplified view)
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <div className="flex space-x-2 text-xs text-gray-500">
                        {order.payment_method && (
                          <span>Payment: {order.payment_method}</span>
                        )}
                        {order.currency && (
                          <span>Currency: {order.currency}</span>
                        )}
                      </div>
                      <Link
                        to={`/order/${order.id}`}
                        className="text-sm text-[#4A5C3D] hover:text-[#3a4a2f] font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Address Management */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 border border-gray-100">
            <AddressManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
