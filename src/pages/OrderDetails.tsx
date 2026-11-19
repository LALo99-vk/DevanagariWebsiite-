import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Download,
  X,
} from "lucide-react";
import { ordersService } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import razorpayService from "../services/razorpay";
import type { Order, OrderItem } from "../services/supabase";

const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();
  const navigate = useNavigate();
  const [order, setOrder] = useState<
    (Order & { order_items: OrderItem[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

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

  const handleOrderAction = async (action: string) => {
    if (!order) return;

    setActionLoading(action);
    try {
      if (action === "cancel") {
        await handleOrderCancellation();
      } else if (action === "track") {
        // Show tracking modal
        setShowTrackingModal(true);
      } else {
        // Handle other actions (return, etc.)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        showSuccess(
          "Request Submitted",
          `${
            action.charAt(0).toUpperCase() + action.slice(1)
          } request submitted successfully!`
        );
      }
    } catch (err) {
      console.error(`Error ${action}ing order:`, err);
      showError(
        "Action Failed",
        `Failed to ${action} order. Please try again.`
      );
    } finally {
      setActionLoading(null);
    }
  };

  const refetchOrder = async () => {
    if (!orderId || !user) return;

    try {
      const orders = await ordersService.getUserOrders(user.id);
      const foundOrder = orders.find((o) => o.id === orderId);

      if (foundOrder) {
        setOrder(foundOrder);
      }
    } catch (err) {
      console.error("Error refetching order:", err);
    }
  };

  const handleOrderCancellation = async () => {
    if (!order) {
      throw new Error("Order not found");
    }

    try {
      // The server checks the order is ours and cancellable, then refunds it if paid.
      const { refund } = await razorpayService.cancelOrder(order.id);
      await refetchOrder();

      showSuccess(
        "Order Cancelled",
        refund
          ? `Order cancelled successfully!\n\nRefund ID: ${refund.id}\nRefund Amount: ₹${(
              refund.amount / 100
            ).toFixed(2)}\n\nYour refund will be processed within 5-7 business days.`
          : "Order cancelled successfully!"
      );

      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (error) {
      console.error("❌ Error cancelling order:", error);
      await refetchOrder();
      showError(
        "Cancellation Failed",
        `${
          error instanceof Error ? error.message : "Unknown error"
        }\n\nIf this keeps happening, contact support with Order ID: ${order.id}`
      );
    }
  };

  const getStatusIcon = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "failed") {
      return <XCircle className="w-6 h-6 text-[#F0A08C]" />;
    }

    switch (status) {
      case "pending":
        return <Clock className="w-6 h-6 text-gold-400" />;
      case "processing":
        return <Package className="w-6 h-6 text-gold-200" />;
      case "shipped":
        return <Truck className="w-6 h-6 text-gold-200" />;
      case "delivered":
        return <CheckCircle className="w-6 h-6 text-emerald-300" />;
      case "cancelled":
        return <XCircle className="w-6 h-6 text-[#F0A08C]" />;
      default:
        return <Clock className="w-6 h-6 text-mist" />;
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

  const canCancel = (order: Order) => {
    return order.status === "pending" || order.status === "processing";
  };

  const canTrack = (order: Order) => {
    return order.status !== "cancelled";
  };

  if (loading) {
    return (
      <div className="bg-emerald-950 text-cream pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mx-auto mb-4"></div>
          <p className="text-mist">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-emerald-950 text-cream pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-16 w-16 text-[#F0A08C] mb-4" />
          <h1 className="font-display text-2xl font-display font-semibold text-cream mb-4">
            {error || "Order not found"}
          </h1>
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center px-4 py-2 bg-gold-400 text-emerald-950 rounded-full hover:bg-gold-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-emerald-950 text-cream pt-24 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-display font-semibold text-cream">
                Order Details
              </h1>
              <p className="text-mist mt-1">
                Order #{order.order_number || order.id.slice(0, 8)} • Placed on{" "}
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusIcon(order.status, order.payment_status)}
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Timeline */}
            <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20">
              <h2 className="text-xl font-display font-semibold text-cream mb-6">
                Order Timeline
              </h2>
              <div className="space-y-4">
                {/* Order Placed */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-300/15 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-300" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-cream">Order Placed</p>
                    <p className="text-sm text-mist">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Payment */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.payment_status === "paid" ||
                        order.payment_status === "refunded"
                          ? "bg-emerald-300/15"
                          : order.payment_status === "failed"
                          ? "bg-[#F0A08C]/15"
                          : "bg-gold-400/15"
                      }`}
                    >
                      <CreditCard
                        className={`w-4 h-4 ${
                          order.payment_status === "paid" ||
                          order.payment_status === "refunded"
                            ? "text-emerald-300"
                            : order.payment_status === "failed"
                            ? "text-[#F0A08C]"
                            : "text-gold-400"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-cream">
                      Payment{" "}
                      {order.payment_status === "paid" ||
                      order.payment_status === "refunded"
                        ? "Confirmed"
                        : order.payment_status === "failed"
                        ? "Failed"
                        : "Pending"}
                    </p>
                    <p className="text-sm text-mist">
                      {order.payment_method || "Razorpay"} •{" "}
                      {order.currency || "INR"}
                    </p>
                  </div>
                </div>

                {/* Processing */}
                {order.status !== "pending" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gold-200/15 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-gold-200" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cream">Processing</p>
                      <p className="text-sm text-mist">
                        Your order is being prepared
                      </p>
                    </div>
                  </div>
                )}

                {/* Shipped */}
                {order.status === "shipped" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gold-200/15 rounded-full flex items-center justify-center">
                        <Truck className="w-4 h-4 text-gold-200" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cream">Shipped</p>
                      <p className="text-sm text-mist">
                        Your order is on its way
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivered */}
                {order.status === "delivered" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-emerald-300/15 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-300" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cream">Delivered</p>
                      <p className="text-sm text-mist">
                        Your order has been delivered
                      </p>
                    </div>
                  </div>
                )}

                {/* Cancelled */}
                {order.status === "cancelled" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-[#F0A08C]/15 rounded-full flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-[#F0A08C]" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cream">Cancelled</p>
                      <p className="text-sm text-mist">
                        This order has been cancelled
                        {order.refund_id && (
                          <span className="block text-emerald-300">
                            Refund ID: {order.refund_id}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Refund Status */}
                {order.refund_id && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          order.refund_status === "processed"
                            ? "bg-emerald-300/15"
                            : order.refund_status === "failed"
                            ? "bg-[#F0A08C]/15"
                            : "bg-gold-400/15"
                        }`}
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            order.refund_status === "processed"
                              ? "text-emerald-300"
                              : order.refund_status === "failed"
                              ? "text-[#F0A08C]"
                              : "text-gold-400"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cream">
                        Refund{" "}
                        {order.refund_status === "processed"
                          ? "Processed"
                          : order.refund_status === "failed"
                          ? "Failed"
                          : "Pending"}
                      </p>
                      <p className="text-sm text-mist">
                        {order.refund_status === "processed"
                          ? `Refund of ₹${order.refund_amount?.toFixed(
                              2
                            )} processed`
                          : order.refund_status === "failed"
                          ? "Refund processing failed - contact support"
                          : "Refund is being processed"}
                        {order.refunded_at && (
                          <span className="block">
                            {new Date(order.refunded_at).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20">
              <h2 className="text-xl font-display font-semibold text-cream mb-6">
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
                        {item.product_name || "Product"}
                      </h3>
                      <p className="text-sm text-mist">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-sm font-medium text-cream">
                        ₹{item.product_price.toFixed(2)}{" "}
                        {order.currency || "INR"} each
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

            {/* Shipping Information */}
            {order.shipping_address ? (
              <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20">
                <h2 className="text-xl font-display font-semibold text-cream mb-4">
                  Shipping Information
                </h2>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-cream mt-1" />
                  <div className="space-y-2">
                    <p className="font-medium text-cream">
                      {order.shipping_address.name || "Recipient Name"}
                    </p>
                    {order.shipping_address.phone && (
                      <p className="text-mist flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        {order.shipping_address.phone}
                      </p>
                    )}
                    <p className="text-mist">
                      {order.shipping_address.address_line_1 ||
                        "Address not provided"}
                    </p>
                    {order.shipping_address.address_line_2 && (
                      <p className="text-mist pl-4">
                        {order.shipping_address.address_line_2}
                      </p>
                    )}
                    <p className="text-mist">
                      {order.shipping_address.city},{" "}
                      {order.shipping_address.state}{" "}
                      {order.shipping_address.postal_code}
                    </p>
                    <p className="text-mist">
                      {order.shipping_address.country || "India"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20">
                <h2 className="text-xl font-display font-semibold text-cream mb-4">
                  Shipping Information
                </h2>
                <div className="flex items-center space-x-3 text-mist">
                  <MapPin className="w-5 h-5" />
                  <p>Shipping address not provided for this order</p>
                </div>
              </div>
            )}

            {/* Payment Information */}
            {order.payment_id && (
              <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20">
                <h2 className="text-xl font-display font-semibold text-cream mb-4">
                  Payment Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-mist">
                      Payment ID:
                    </span>
                    <p className="text-cream font-mono break-all">
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
                          : order.payment_status === "refunded"
                          ? "bg-gold-200/15 text-gold-200"
                          : "bg-gold-400/15 text-gold-400"
                      }`}
                    >
                      {order.payment_status || "Pending"}
                    </span>
                  </div>
                </div>

                {/* Refund Information */}
                {order.refund_id && (
                  <div className="mt-4 pt-4 border-t border-gold-400/20">
                    <h3 className="text-lg font-display font-semibold text-cream mb-3">
                      Refund Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-mist">
                          Refund ID:
                        </span>
                        <p className="text-cream font-mono break-all">
                          {order.refund_id}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-mist">
                          Refund Amount:
                        </span>
                        <p className="text-cream font-semibold">
                          $
                          {(() => {
                            const amount = order.refund_amount || 0;
                            // Convert INR to USD if amount seems to be in INR
                            const usdToInrRate = 83;
                            const displayAmount =
                              amount > 100 ? amount / usdToInrRate : amount;
                            return displayAmount.toFixed(2);
                          })()}{" "}
                          {order.currency || "USD"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-mist">
                          Refund Status:
                        </span>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            order.refund_status === "processed"
                              ? "bg-emerald-300/15 text-emerald-300"
                              : order.refund_status === "failed"
                              ? "bg-[#F0A08C]/15 text-[#F0A08C]"
                              : "bg-gold-400/15 text-gold-400"
                          }`}
                        >
                          {order.refund_status || "Pending"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-mist">
                          Refund Date:
                        </span>
                        <p className="text-cream">
                          {order.refunded_at
                            ? new Date(order.refunded_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      {order.refund_reason && (
                        <div className="col-span-2">
                          <span className="font-medium text-mist">
                            Refund Reason:
                          </span>
                          <p className="text-cream">{order.refund_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-emerald-900 rounded-xl p-6 border border-gold-400/20 sticky top-24">
              <h2 className="text-xl font-display font-semibold text-cream mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-mist">Subtotal:</span>
                  <span className="text-cream">
                    ₹{order.subtotal.toFixed(2)} {order.currency || "INR"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-mist">Shipping:</span>
                  <span className="text-cream">
                    ₹{order.shipping_amount?.toFixed(2) || "0.00"}{" "}
                    {order.currency || "INR"}
                  </span>
                </div>

                {(order.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-emerald-300">
                    <span>Discount:</span>
                    <span>
                      -₹{Number(order.discount_amount).toFixed(2)}{" "}
                      {order.currency || "INR"}
                    </span>
                  </div>
                )}

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
                {canCancel(order) && (
                  <button
                    onClick={() => handleOrderAction("cancel")}
                    disabled={actionLoading === "cancel"}
                    className="w-full bg-[#F0A08C] text-emerald-950 py-2.5 rounded-full font-semibold hover:bg-[#F4B5A4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {actionLoading === "cancel" ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span>Cancel Order</span>
                  </button>
                )}

                {canTrack(order) && (
                  <button
                    onClick={() => handleOrderAction("track")}
                    disabled={actionLoading === "track"}
                    className="w-full border border-gold-400/60 text-gold-200 py-2.5 rounded-full font-semibold hover:bg-gold-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {actionLoading === "track" ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )}
                    <span>Track Package</span>
                  </button>
                )}

                <button
                  onClick={() => window.print()}
                  className="w-full border border-gold-400/60 text-gold-200 py-2.5 rounded-full font-semibold hover:bg-gold-400/10 transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Invoice</span>
                </button>

                <button
                  onClick={() => navigate("/contact")}
                  className="w-full border border-gold-400/60 text-gold-200 py-2.5 rounded-full font-semibold hover:bg-gold-400/10 transition-colors flex items-center justify-center space-x-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact Support</span>
                </button>
              </div>

              {/* Important Notes */}
              <div className="mt-6 p-4 bg-gold-400/10 border border-gold-400/40 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-gold-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-gold-400 mb-1">
                      Important Notes:
                    </p>
                    <ul className="text-gold-400 space-y-1">
                      <li>• Orders can be cancelled within 24 hours</li>
                      <li>• Contact support for any issues</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Order Tracking Modal */}
      {showTrackingModal && order && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-black/60 transition-opacity"
              onClick={() => setShowTrackingModal(false)}
            />
            <div className="inline-block align-bottom bg-emerald-900 rounded-lg text-left overflow-hidden shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-emerald-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg leading-6 font-medium text-cream">
                    Track Your Package
                  </h3>
                  <button
                    onClick={() => setShowTrackingModal(false)}
                    className="text-mist/80 hover:text-mist"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-gold-200/10 border border-gold-200/40 rounded-lg p-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gold-200 mr-2" />
                      <div>
                        <p className="font-medium text-gold-200">
                          Order #{order.order_number || order.id.slice(-8)}
                        </p>
                        <p className="text-sm text-gold-200">
                          Expected delivery:{" "}
                          {(() => {
                            const deliveryDate = new Date(order.created_at);
                            deliveryDate.setDate(deliveryDate.getDate() + 5); // 5 days from order
                            return deliveryDate.toLocaleDateString("en-IN", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            });
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Tracking Timeline */}
                <div className="space-y-4">
                  <h4 className="font-medium text-cream mb-4">
                    Package Status
                  </h4>

                  {/* Order Placed */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-emerald-300/15 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-300" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cream">Order Placed</p>
                      <p className="text-sm text-mist">
                        {new Date(order.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          order.payment_status === "paid"
                            ? "bg-emerald-300/15"
                            : order.payment_status === "failed"
                            ? "bg-[#F0A08C]/15"
                            : "bg-gold-400/15"
                        }`}
                      >
                        <CreditCard
                          className={`w-4 h-4 ${
                            order.payment_status === "paid"
                              ? "text-emerald-300"
                              : order.payment_status === "failed"
                              ? "text-[#F0A08C]"
                              : "text-gold-400"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-cream">
                        Payment{" "}
                        {order.payment_status === "paid"
                          ? "Confirmed"
                          : "Pending"}
                      </p>
                      <p className="text-sm text-mist">
                        {order.payment_method || "Razorpay"} • ₹
                        {order.total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Processing */}
                  {order.status !== "pending" && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            order.status === "processing"
                              ? "bg-gold-200/15"
                              : "bg-emerald-300/15"
                          }`}
                        >
                          <Package
                            className={`w-4 h-4 ${
                              order.status === "processing"
                                ? "text-gold-200"
                                : "text-emerald-300"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-cream">Processing</p>
                        <p className="text-sm text-mist">
                          Your order is being prepared for shipment
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Shipped */}
                  {order.status === "shipped" && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gold-200/15 rounded-full flex items-center justify-center">
                          <Truck className="w-4 h-4 text-gold-200" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-cream">Shipped</p>
                        <p className="text-sm text-mist">
                          Your package is on its way to you
                        </p>
                        <div className="mt-2 bg-gold-200/10 border border-gold-200/40 rounded-lg p-3">
                          <p className="text-sm text-gold-200">
                            <strong>Tracking Number:</strong> DHM
                            {order.id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-sm text-gold-200 mt-1">
                            You can track your package using this number with
                            our delivery partner.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivered */}
                  {order.status === "delivered" && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-emerald-300/15 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-300" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-cream">Delivered</p>
                        <p className="text-sm text-mist">
                          Your package has been successfully delivered
                        </p>
                        <div className="mt-2 bg-emerald-300/10 border border-emerald-300/40 rounded-lg p-3">
                          <p className="text-sm text-emerald-300">
                            Thank you for choosing Devanagari Health Mix! We
                            hope you enjoy your products.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancelled */}
                  {order.status === "cancelled" && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-[#F0A08C]/15 rounded-full flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-[#F0A08C]" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-cream">
                          Order Cancelled
                        </p>
                        <p className="text-sm text-mist">
                          This order has been cancelled
                        </p>
                        {order.refund_id && (
                          <div className="mt-2 bg-gold-400/10 border border-gold-400/40 rounded-lg p-3">
                            <p className="text-sm text-gold-400">
                              <strong>Refund Status:</strong>{" "}
                              {order.refund_status || "Processing"}
                            </p>
                            <p className="text-sm text-gold-400">
                              Refund ID: {order.refund_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shipping Address in Tracking */}
                {order.shipping_address && (
                  <div className="mt-6">
                    <h4 className="font-medium text-cream mb-3">
                      Delivery Address
                    </h4>
                    <div className="bg-emerald-950/50 border border-gold-400/20 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-mist mt-0.5" />
                        <div>
                          <p className="font-medium text-cream">
                            {order.shipping_address.name}
                          </p>
                          {order.shipping_address.phone && (
                            <p className="text-sm text-mist">
                              {order.shipping_address.phone}
                            </p>
                          )}
                          <p className="text-sm text-mist">
                            {order.shipping_address.address_line_1}
                          </p>
                          {order.shipping_address.address_line_2 && (
                            <p className="text-sm text-mist">
                              {order.shipping_address.address_line_2}
                            </p>
                          )}
                          <p className="text-sm text-mist">
                            {order.shipping_address.city},{" "}
                            {order.shipping_address.state}{" "}
                            {order.shipping_address.postal_code}
                          </p>
                          <p className="text-sm text-mist">
                            {order.shipping_address.country || "India"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Support Information */}
                <div className="mt-6 bg-gold-200/10 border border-gold-200/40 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-gold-200 mt-0.5" />
                    <div>
                      <p className="font-medium text-gold-200">Need Help?</p>
                      <p className="text-sm text-gold-200 mt-1">
                        If you have any questions about your order or delivery,
                        please contact our support team.
                      </p>
                      <button
                        onClick={() => {
                          setShowTrackingModal(false);
                          navigate("/contact");
                        }}
                        className="mt-2 text-sm text-gold-200 hover:text-gold-200 underline"
                      >
                        Contact Support
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-950/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowTrackingModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 bg-gold-200 text-base font-medium text-cream hover:bg-gold-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
