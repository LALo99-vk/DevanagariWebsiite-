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
      return <XCircle className="w-8 h-8 text-[#F0A08C]" />;
    }

    switch (status) {
      case "pending":
        return <Clock className="w-8 h-8 text-gold-400" />;
      case "processing":
        return <Package className="w-8 h-8 text-gold-200" />;
      case "shipped":
        return <Truck className="w-8 h-8 text-gold-200" />;
      case "delivered":
        return <CheckCircle className="w-8 h-8 text-emerald-300" />;
      case "cancelled":
        return <XCircle className="w-8 h-8 text-[#F0A08C]" />;
      default:
        return <Clock className="w-8 h-8 text-mist" />;
    }
  };

  const getStatusColor = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "failed") return "text-[#F0A08C] bg-[#F0A08C]/15";

    switch (status) {
      case "pending":
        return "text-gold-400 bg-gold-400/15";
      case "processing":
        return "text-gold-200 bg-gold-200/15";
      case "shipped":
        return "text-gold-200 bg-gold-200/15";
      case "delivered":
        return "text-emerald-300 bg-emerald-300/15";
      case "cancelled":
        return "text-[#F0A08C] bg-[#F0A08C]/15";
      default:
        return "text-mist bg-emerald-800";
    }
  };

  const formatStatus = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "failed") return "Payment Failed";

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="bg-emerald-950 text-cream pt-24 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
            <span className="ml-4 text-mist">Loading order details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-emerald-950 text-cream pt-24 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-[#F0A08C] mb-4" />
            <h1 className="font-display text-2xl font-display font-semibold text-cream mb-4">
              {error || "Order not found"}
            </h1>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center px-4 py-2 bg-gold-400 text-emerald-950 rounded-full hover:bg-gold-300 transition-colors"
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
    <div className="bg-emerald-950 text-cream pt-24 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </button>

          <div className="flex items-center space-x-4 mb-6">
            {getStatusIcon(order.status, order.payment_status)}
            <div>
              <h1 className="font-display text-3xl font-display font-semibold text-cream">
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
            <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20">
              <h2 className="text-xl font-display font-semibold text-cream mb-4">
                Order Items
              </h2>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-4 p-4 border border-gold-400/20 rounded-lg"
                  >
                    <div className="w-16 h-16 bg-emerald-950/60 rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-cream" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-cream">
                        {item.product?.name || "Product"}
                      </h3>
                      <p className="text-sm text-mist">
                        {item.product?.weight}g pack
                      </p>
                      <p className="text-sm font-medium text-cream">
                        ₹{item.product_price.toFixed(2)}{" "}
                        {order.currency || "INR"} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cream">
                        ₹{item.total_price.toFixed(2)} {order.currency || "INR"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Information */}
            {order.payment_id && (
              <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20">
                <h2 className="text-xl font-display font-semibold text-cream mb-4">
                  Payment Information
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-mist">
                      Payment ID:
                    </span>
                    <p className="text-cream font-mono">
                      {order.payment_id}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-mist">
                      Payment Method:
                    </span>
                    <p className="text-cream capitalize">
                      {order.payment_method || "Razorpay"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-mist">Currency:</span>
                    <p className="text-cream">{order.currency || "INR"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-mist">
                      Payment Status:
                    </span>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        order.payment_status === "paid"
                          ? "bg-emerald-300/15 text-emerald-300"
                          : order.payment_status === "failed"
                          ? "bg-[#F0A08C]/15 text-[#F0A08C]"
                          : "bg-gold-400/15 text-gold-400"
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
            <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20 sticky top-24">
              <h2 className="text-xl font-display font-semibold text-cream mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-mist">Order Date:</span>
                  <span className="text-cream">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-mist">Total Items:</span>
                  <span className="text-cream">
                    {order.order_items.reduce(
                      (sum, item) => sum + item.quantity,
                      0
                    )}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-cream">Total:</span>
                    <span className="text-gold-300">
                      ₹{order.total.toFixed(2)} {order.currency || "INR"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Actions */}
              <div className="mt-6 space-y-3">
                {order.status === "pending" &&
                  order.payment_status !== "paid" && (
                    <button className="w-full bg-gold-400 text-emerald-950 py-2 rounded-full font-semibold hover:bg-gold-300 transition-colors">
                      Complete Payment
                    </button>
                  )}

                {order.status === "shipped" && (
                  <button className="w-full border border-gold-400/60 text-gold-200 py-2.5 rounded-full font-semibold hover:bg-gold-400/10 transition-colors">
                    Track Package
                  </button>
                )}

                <button
                  onClick={() => navigate("/contact")}
                  className="w-full border border-gold-400/60 text-gold-200 py-2.5 rounded-full font-semibold hover:bg-gold-400/10 transition-colors"
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
