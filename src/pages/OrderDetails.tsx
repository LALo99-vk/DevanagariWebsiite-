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

    // If order doesn't have payment_id (e.g., old COD orders), just cancel without refund
    if (!order.payment_id) {
      await ordersService.cancelOrder(order.id);
      await refetchOrder();
      showSuccess("Order Cancelled", "Order cancelled successfully!");
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
      return;
    }

    try {
      // Debug: Log the refund amount being sent
      console.log("🔄 Processing refund for order:", {
        order_id: order.id,
        payment_id: order.payment_id,
        order_total: order.total,
        refund_amount_inr: order.total,
        refund_amount_paise: Math.round(order.total * 100),
      });

      // Process refund through Razorpay
      const refund = await razorpayService.processRefund(
        order.payment_id,
        order.total,
        "Order cancelled by customer",
        "normal"
      );

      // Update order in database with refund information
      const refundData = {
        refund_id: refund.id,
        refund_amount: refund.amount / 100, // Convert from paise to INR
        refund_reason: "Order cancelled by customer",
        refund_status: refund.status as "pending" | "processed" | "failed",
        refunded_at: new Date(refund.created_at * 1000).toISOString(),
      };

      await ordersService.cancelOrder(order.id, refundData);

      // Refetch order data from database to ensure it's up to date
      await refetchOrder();

      showSuccess(
        "Order Cancelled",
        `Order cancelled successfully!\n\nRefund ID: ${
          refund.id
        }\nRefund Amount: ₹${order.total.toFixed(
          2
        )}\n\nYour refund will be processed within 5-7 business days.`
      );

      // Redirect to orders page after successful cancellation
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (error) {
      console.error("❌ Error processing cancellation:", error);

      // Extract more specific error information
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("❌ Error details:", {
          message: error.message,
          stack: error.stack,
          paymentId: order.payment_id,
          orderId: order.id,
          total: order.total,
        });
      }

      // If refund fails, still cancel the order but without refund
      if (order.payment_status === "paid") {
        await ordersService.cancelOrder(order.id);

        // Refetch order data from database
        await refetchOrder();

        showError(
          "Refund Processing Failed",
          `Order cancelled, but refund processing failed.\n\nError: ${errorMessage}\n\nPlease contact support with Order ID: ${order.id}`
        );

        // Redirect to orders page
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      } else {
        // If payment wasn't completed, just cancel the order
        await ordersService.cancelOrder(order.id);

        // Refetch order data from database
        await refetchOrder();

        showSuccess("Order Cancelled", "Order cancelled successfully!");

        // Redirect to orders page
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      }
    }
  };

  const getStatusIcon = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "failed") {
      return <XCircle className="w-6 h-6 text-red-500" />;
    }

    switch (status) {
      case "pending":
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case "processing":
        return <Package className="w-6 h-6 text-blue-500" />;
      case "shipped":
        return <Truck className="w-6 h-6 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-500" />;
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

  const canCancel = (order: Order) => {
    return order.status === "pending" || order.status === "processing";
  };

  const canTrack = (order: Order) => {
    return order.status !== "cancelled";
  };

  if (loading) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A5C3D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-[#FDFBF8] pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Order not found"}
          </h1>
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center px-4 py-2 bg-[#4A5C3D] text-white rounded-lg hover:bg-[#3a4a2f] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="inline-flex items-center text-[#4A5C3D] hover:text-[#3a4a2f] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#4A5C3D]">
                Order Details
              </h1>
              <p className="text-gray-600 mt-1">
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
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-6">
                Order Timeline
              </h2>
              <div className="space-y-4">
                {/* Order Placed */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Order Placed</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Payment */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.payment_status === "paid"
                          ? "bg-green-100"
                          : order.payment_status === "failed"
                          ? "bg-red-100"
                          : "bg-yellow-100"
                      }`}
                    >
                      <CreditCard
                        className={`w-4 h-4 ${
                          order.payment_status === "paid"
                            ? "text-green-600"
                            : order.payment_status === "failed"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Payment{" "}
                      {order.payment_status === "paid"
                        ? "Confirmed"
                        : order.payment_status === "failed"
                        ? "Failed"
                        : "Pending"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.payment_method || "Razorpay"} •{" "}
                      {order.currency || "INR"}
                    </p>
                  </div>
                </div>

                {/* Processing */}
                {order.status !== "pending" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Processing</p>
                      <p className="text-sm text-gray-500">
                        Your order is being prepared
                      </p>
                    </div>
                  </div>
                )}

                {/* Shipped */}
                {order.status === "shipped" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Truck className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Shipped</p>
                      <p className="text-sm text-gray-500">
                        Your order is on its way
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivered */}
                {order.status === "delivered" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Delivered</p>
                      <p className="text-sm text-gray-500">
                        Your order has been delivered
                      </p>
                    </div>
                  </div>
                )}

                {/* Cancelled */}
                {order.status === "cancelled" && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Cancelled</p>
                      <p className="text-sm text-gray-500">
                        This order has been cancelled
                        {order.refund_id && (
                          <span className="block text-green-600">
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
                            ? "bg-green-100"
                            : order.refund_status === "failed"
                            ? "bg-red-100"
                            : "bg-yellow-100"
                        }`}
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            order.refund_status === "processed"
                              ? "text-green-600"
                              : order.refund_status === "failed"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Refund{" "}
                        {order.refund_status === "processed"
                          ? "Processed"
                          : order.refund_status === "failed"
                          ? "Failed"
                          : "Pending"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.refund_status === "processed"
                          ? `Refund of $${order.refund_amount?.toFixed(
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
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-6">
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
                        {item.product_name || "Product"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-sm font-medium text-[#4A5C3D]">
                        ₹{item.product_price.toFixed(2)}{" "}
                        {order.currency || "INR"} each
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

            {/* Shipping Information */}
            {order.shipping_address ? (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-[#4A5C3D] mb-4">
                  Shipping Information
                </h2>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-[#4A5C3D] mt-1" />
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">
                      {order.shipping_address.name || "Recipient Name"}
                    </p>
                    {order.shipping_address.phone && (
                      <p className="text-gray-600 flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        {order.shipping_address.phone}
                      </p>
                    )}
                    <p className="text-gray-600">
                      {order.shipping_address.address_line_1 ||
                        "Address not provided"}
                    </p>
                    {order.shipping_address.address_line_2 && (
                      <p className="text-gray-600 pl-4">
                        {order.shipping_address.address_line_2}
                      </p>
                    )}
                    <p className="text-gray-600">
                      {order.shipping_address.city},{" "}
                      {order.shipping_address.state}{" "}
                      {order.shipping_address.postal_code}
                    </p>
                    <p className="text-gray-600">
                      {order.shipping_address.country || "India"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-[#4A5C3D] mb-4">
                  Shipping Information
                </h2>
                <div className="flex items-center space-x-3 text-gray-500">
                  <MapPin className="w-5 h-5" />
                  <p>Shipping address not provided for this order</p>
                </div>
              </div>
            )}

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
                          : order.payment_status === "refunded"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.payment_status || "Pending"}
                    </span>
                  </div>
                </div>

                {/* Refund Information */}
                {order.refund_id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Refund Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">
                          Refund ID:
                        </span>
                        <p className="text-gray-900 font-mono">
                          {order.refund_id}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Refund Amount:
                        </span>
                        <p className="text-gray-900 font-semibold">
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
                        <span className="font-medium text-gray-600">
                          Refund Status:
                        </span>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            order.refund_status === "processed"
                              ? "bg-green-100 text-green-800"
                              : order.refund_status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {order.refund_status || "Pending"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">
                          Refund Date:
                        </span>
                        <p className="text-gray-900">
                          {order.refunded_at
                            ? new Date(order.refunded_at).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      {order.refund_reason && (
                        <div className="col-span-2">
                          <span className="font-medium text-gray-600">
                            Refund Reason:
                          </span>
                          <p className="text-gray-900">{order.refund_reason}</p>
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
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 sticky top-24">
              <h2 className="text-xl font-bold text-[#4A5C3D] mb-6">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">
                    ₹{order.subtotal.toFixed(2)} {order.currency || "INR"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="text-gray-900">
                    ₹{order.shipping_amount?.toFixed(2) || "0.00"}{" "}
                    {order.currency || "INR"}
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
                {canCancel(order) && (
                  <button
                    onClick={() => handleOrderAction("cancel")}
                    disabled={actionLoading === "cancel"}
                    className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                    className="w-full border-2 border-blue-600 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                  className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Invoice</span>
                </button>

                <button
                  onClick={() => navigate("/contact")}
                  className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact Support</span>
                </button>
              </div>

              {/* Important Notes */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 mb-1">
                      Important Notes:
                    </p>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• Orders can be cancelled within 24 hours</li>
                      <li>• Returns accepted within 30 days</li>
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
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowTrackingModal(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Track Your Package
                  </h3>
                  <button
                    onClick={() => setShowTrackingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="font-medium text-blue-900">
                          Order #{order.order_number || order.id.slice(-8)}
                        </p>
                        <p className="text-sm text-blue-700">
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
                  <h4 className="font-medium text-gray-900 mb-4">
                    Package Status
                  </h4>

                  {/* Order Placed */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Order Placed</p>
                      <p className="text-sm text-gray-500">
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
                            ? "bg-green-100"
                            : order.payment_status === "failed"
                            ? "bg-red-100"
                            : "bg-yellow-100"
                        }`}
                      >
                        <CreditCard
                          className={`w-4 h-4 ${
                            order.payment_status === "paid"
                              ? "text-green-600"
                              : order.payment_status === "failed"
                              ? "text-red-600"
                              : "text-yellow-600"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        Payment{" "}
                        {order.payment_status === "paid"
                          ? "Confirmed"
                          : "Pending"}
                      </p>
                      <p className="text-sm text-gray-500">
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
                              ? "bg-blue-100"
                              : "bg-green-100"
                          }`}
                        >
                          <Package
                            className={`w-4 h-4 ${
                              order.status === "processing"
                                ? "text-blue-600"
                                : "text-green-600"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Processing</p>
                        <p className="text-sm text-gray-500">
                          Your order is being prepared for shipment
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Shipped */}
                  {order.status === "shipped" && (
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Truck className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Shipped</p>
                        <p className="text-sm text-gray-500">
                          Your package is on its way to you
                        </p>
                        <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-sm text-purple-800">
                            <strong>Tracking Number:</strong> DHM
                            {order.id.slice(-8).toUpperCase()}
                          </p>
                          <p className="text-sm text-purple-700 mt-1">
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
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Delivered</p>
                        <p className="text-sm text-gray-500">
                          Your package has been successfully delivered
                        </p>
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800">
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
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-red-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Order Cancelled
                        </p>
                        <p className="text-sm text-gray-500">
                          This order has been cancelled
                        </p>
                        {order.refund_id && (
                          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              <strong>Refund Status:</strong>{" "}
                              {order.refund_status || "Processing"}
                            </p>
                            <p className="text-sm text-yellow-700">
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
                    <h4 className="font-medium text-gray-900 mb-3">
                      Delivery Address
                    </h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {order.shipping_address.name}
                          </p>
                          {order.shipping_address.phone && (
                            <p className="text-sm text-gray-600">
                              {order.shipping_address.phone}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            {order.shipping_address.address_line_1}
                          </p>
                          {order.shipping_address.address_line_2 && (
                            <p className="text-sm text-gray-600">
                              {order.shipping_address.address_line_2}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            {order.shipping_address.city},{" "}
                            {order.shipping_address.state}{" "}
                            {order.shipping_address.postal_code}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.shipping_address.country || "India"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Support Information */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Need Help?</p>
                      <p className="text-sm text-blue-800 mt-1">
                        If you have any questions about your order or delivery,
                        please contact our support team.
                      </p>
                      <button
                        onClick={() => {
                          setShowTrackingModal(false);
                          navigate("/contact");
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Contact Support
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowTrackingModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
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
