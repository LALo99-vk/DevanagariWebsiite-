import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  ArrowLeft,
} from "lucide-react";
import { ordersService } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import type { Order, OrderItem } from "../services/supabase";

const OrderStatus: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<
    (Order & { order_items: OrderItem[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user) {
        setError("Order ID or user not found");
        setLoading(false);
        return;
      }

      try {
        const orders = await ordersService.getUserOrders(user.id);
        const foundOrder = orders.find((o) => o.id === orderId);

        if (!foundOrder) {
          setError("Order not found");
        } else {
          setOrder(foundOrder);
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user]);

  const getStatusIcon = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "failed") {
      return <XCircle className="w-8 h-8 text-red-500" />;
    }

    switch (status) {
      case "pending":
        return <Clock className="w-8 h-8 text-yellow-500" />;
      case "processing":
        return <Package className="w-8 h-8 text-blue-500" />;
      case "shipped":
        return <Truck className="w-8 h-8 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Clock className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "failed") return "text-red-600 bg-red-100";

    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "shipped":
        return "text-purple-600 bg-purple-100";
      case "delivered":
        return "text-green-600 bg-green-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatStatus = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "failed") return "Payment Failed";

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A5C3D]"></div>
            <span className="ml-4 text-gray-600">Loading order details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || "Order not found"}
            </h1>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center px-4 py-2 bg-[#4A5C3D] text-white rounded-lg hover:bg-[#3a4a2f] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center text-[#4A5C3D] hover:text-[#3a4a2f] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </button>

          <div className="flex items-center space-x-4 mb-6">
            {getStatusIcon(order.status, order.payment_status)}
            <div>
              <h1 className="text-3xl font-bold text-[#4A5C3D]">
                Order #{order.id.slice(0, 8)}
              </h1>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  order.status,
                  order.payment_status
                )}`}
              >
                {formatStatus(order.status, order.payment_status)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-4">
                Order Items
              </h2>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="w-16 h-16 bg-[#E6D9C5] rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-[#4A5C3D]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.product?.name || "Product"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.product?.weight}g pack
                      </p>
                      <p className="text-sm font-medium text-[#4A5C3D]">
                        ₹{item.product_price.toFixed(2)}{" "}
                        {order.currency || "INR"} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#4A5C3D]">
                        ₹{item.total_price.toFixed(2)} {order.currency || "INR"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Information */}
            {order.payment_id && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-[#4A5C3D] mb-4">
                  Payment Information
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">
                      Payment ID:
                    </span>
                    <p className="text-gray-900 font-mono">
                      {order.payment_id}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Payment Method:
                    </span>
                    <p className="text-gray-900 capitalize">
                      {order.payment_method || "Razorpay"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Currency:</span>
                    <p className="text-gray-900">{order.currency || "INR"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">
                      Payment Status:
                    </span>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        order.payment_status === "paid"
                          ? "bg-green-100 text-green-800"
                          : order.payment_status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.payment_status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 sticky top-24">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="text-gray-900">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="text-gray-900">
                    {order.order_items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    )}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-[#4A5C3D]">Total:</span>
                    <span className="text-[#A88B67]">
                      ₹{order.total.toFixed(2)} {order.currency || "INR"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Actions */}
              <div className="mt-6 space-y-3">
                {order.status === "pending" &&
                  order.payment_status !== "paid" && (
                    <button className="w-full bg-[#4A5C3D] text-white py-2 rounded-lg font-semibold hover:bg-[#3a4a2f] transition-colors">
                      Complete Payment
                    </button>
                  )}

                {order.status === "shipped" && (
                  <button className="w-full border-2 border-[#4A5C3D] text-[#4A5C3D] py-2 rounded-lg font-semibold hover:bg-[#4A5C3D] hover:text-white transition-colors">
                    Track Package
                  </button>
                )}

                <button
                  onClick={() => navigate("/contact")}
                  className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
