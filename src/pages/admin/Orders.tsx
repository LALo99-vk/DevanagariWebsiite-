import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  Calendar,
  User,
  IndianRupee,
  RefreshCw,
  Clock,
  Download,
  MapPin,
  CreditCard,
  Phone,
  Mail,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";
import { mockAdminData, simulateDbDelay } from "../../utils/mockData";
import { supabaseRestApi } from "../../utils/supabaseRestApi";


// Escapes text before it is placed into HTML (customer-entered fields like
// names and addresses must never be interpreted as markup).
const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

interface Order {
  id: string;
  user_id: string;
  subtotal?: number;
  total: number;
  shipping_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string;
  payment_id?: string;
  payment_order_id?: string;
  currency: string;
  shipping_address?: any;
  billing_address?: any;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  // Refund information
  refund_id?: string;
  refund_amount?: number;
  refund_reason?: string;
  refund_status?: "pending" | "processed" | "failed";
  refunded_at?: string;
  user: {
    name: string;
    email: string;
  };
  order_items: Array<{
    product_name?: string;
    product_price?: number;
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    total_price: number;
    product: {
      name: string;
      image_url: string;
    };
  }>;
}

const Orders: React.FC = () => {
  const { logAdminAction } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Deep link from the shelf: ?order=<id> opens that order's details.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const orderId = searchParams.get("order");
    if (loading || !orderId) return;
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setShowModal(true);
    }
    setSearchParams({}, { replace: true });
  }, [loading, searchParams]);

  // Debug selectedOrder changes
  useEffect(() => {
    console.log("🔍 selectedOrder changed:", selectedOrder);
    console.log("🔍 showModal:", showModal);
  }, [selectedOrder, showModal]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching orders from database...");

      // Try authenticated Supabase client first
      try {
        console.log(
          "📡 Using authenticated Supabase client to fetch orders..."
        );
        const { data: orders, error } = await supabase
          .from("orders")
          .select(
            `
            *,
            user:users(name,email),
            order_items(*,product:products(name,image_url))
          `
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ Error fetching orders:", error);
          throw error;
        }

        console.log(
          "✅ Orders loaded (real data from authenticated Supabase):",
          orders?.length || 0,
          "orders"
        );
        setOrders(orders || []);
      } catch (supabaseError) {
        console.warn(
          "⚠️ Authenticated Supabase failed, trying REST API:",
          supabaseError
        );

        // Fallback to REST API
        try {
          console.log("📡 Using REST API as fallback...");
          const orders = await supabaseRestApi.getOrders();
          console.log(
            "✅ Orders loaded (real data from REST API):",
            orders.length,
            "orders"
          );
          setOrders(orders);
        } catch (restApiError) {
          console.warn(
            "⚠️ REST API also failed, using mock data:",
            restApiError
          );

          // Fallback to mock data
          console.log("📦 Using mock data as fallback");
          await simulateDbDelay(300);
          setOrders(mockAdminData.orders.data);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      await logAdminAction({
        action_type: "update",
        resource_type: "order",
        resource_id: orderId,
        old_values: { status: orders.find((o) => o.id === orderId)?.status },
        new_values: { status: newStatus },
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus as any,
                updated_at: new Date().toISOString(),
              }
            : order
        )
      );
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-adm-amber-ink" />;
      case "processing":
        return <Package className="h-4 w-4 text-adm-forest" />;
      case "shipped":
        return <Truck className="h-4 w-4 text-adm-forest" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-adm-sage-ink" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-adm-brick" />;
      case "refunded":
        return <RefreshCw className="h-4 w-4 text-adm-forest" />;
      default:
        return <Clock className="h-4 w-4 text-adm-ink-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "adm-chip-amber";
      case "processing":
        return "adm-chip-amber";
      case "shipped":
        return "adm-chip-plain";
      case "delivered":
        return "adm-chip-sage";
      case "cancelled":
        return "adm-chip-brick";
      case "refunded":
        return "adm-chip-brick";
      default:
        return "adm-chip-plain";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Earned = paid and not cancelled or refunded; the shelf and earnings page match.
  const totalRevenue = orders
    .filter((order) => order.payment_status === "paid" && order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.total), 0);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (order) => order.status === "pending" || order.status === "processing"
  ).length;
  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  // PDF Export functionality
  const exportOrderToPDF = async (order: Order) => {
    try {
      // Create a temporary element to render the PDF content
      const element = document.createElement("div");
      element.innerHTML = generateOrderPDFContent(order);
      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.top = "-9999px";
      element.style.width = "800px";
      element.style.padding = "20px";
      element.style.backgroundColor = "white";
      element.style.fontFamily = "Arial, sans-serif";
      element.style.fontSize = "12px";
      document.body.appendChild(element);

      // Generate PDF
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Clean up
      document.body.removeChild(element);

      // Download PDF
      pdf.save(`Order-${order.id.slice(-8)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const generateOrderPDFContent = (order: Order) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return `
      <div style="max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Devanagari Health Mix</h1>
          <p style="margin: 5px 0; color: #666;">Natural Wellness & Nutrition</p>
          <h2 style="color: #333; margin: 15px 0 0 0; font-size: 24px;">Order Invoice</h2>
        </div>

        <!-- Order Info -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h3 style="color: #333; margin: 0 0 10px 0;">Order Information</h3>
            <p style="margin: 5px 0;"><strong>Order ID:</strong> #${order.id.slice(
              -8
            )}</p>
            <p style="margin: 5px 0;"><strong>Order Date:</strong> ${formatDate(
              order.created_at
            )}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="text-transform: capitalize; color: ${
              getStatusColor(order.status).includes("sage")
                ? "#059669"
                : getStatusColor(order.status).includes("brick")
                ? "#dc2626"
                : "#d97706"
            };">${esc(order.status)}</span></p>
            <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="text-transform: capitalize; color: ${
              order.payment_status === "paid" ? "#059669" : "#d97706"
            };">${esc(order.payment_status)}</span></p>
          </div>
          <div>
            <h3 style="color: #333; margin: 0 0 10px 0;">Payment Details</h3>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${esc(
              order.payment_method
            )}</p>
            ${
              order.payment_id
                ? `<p style="margin: 5px 0;"><strong>Payment ID:</strong> ${esc(order.payment_id)}</p>`
                : ""
            }
            <p style="margin: 5px 0;"><strong>Currency:</strong> ${esc(
              order.currency
            )}</p>
          </div>
        </div>

        <!-- Customer Information -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Customer Information</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${
              esc(order.user?.name || "Unknown")
            }</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${
              esc(order.user?.email || "No email")
            }</p>
          </div>
        </div>

        <!-- Shipping Address -->
        ${
          order.shipping_address
            ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Shipping Address</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${
              esc(order.shipping_address.name || "Not provided")
            }</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${
              esc(order.shipping_address.phone || "Not provided")
            }</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${
              esc(order.shipping_address.address_line_1 || "Not provided")
            }</p>
            ${
              order.shipping_address.address_line_2
                ? `<p style="margin: 5px 0;">${esc(order.shipping_address.address_line_2)}</p>`
                : ""
            }
            <p style="margin: 5px 0;">${esc(order.shipping_address.city || "")}, ${
                esc(order.shipping_address.state || "")
              } ${esc(order.shipping_address.postal_code || "")}</p>
            <p style="margin: 5px 0;"><strong>Country:</strong> ${
              esc(order.shipping_address.country || "India")
            }</p>
          </div>
        </div>
        `
            : ""
        }

        <!-- Order Items -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left;">Product</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: center;">Quantity</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Price</th>
                <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                order.order_items
                  ?.map(
                    (item) => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 12px;">
                    <strong>${esc(item.product?.name || item.product_name || "Unknown Product")}</strong>
                  </td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center;">${esc(
                    item.quantity
                  )}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">₹${
                    Number(item.product_price ?? item.price ?? 0).toFixed(2)
                  }</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">₹${
                    item.total_price?.toFixed(2) || "0.00"
                  }</td>
                </tr>
              `
                  )
                  .join("") ||
                '<tr><td colspan="4" style="border: 1px solid #e5e7eb; padding: 12px; text-align: center;">No items found</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <!-- Order Summary -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Order Summary</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            ${
              order.subtotal
                ? `<p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>₹${order.subtotal.toFixed(
                    2
                  )}</span></p>`
                : ""
            }
            ${
              order.shipping_amount
                ? `<p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Shipping:</span> <span>₹${order.shipping_amount.toFixed(
                    2
                  )}</span></p>`
                : ""
            }
            ${
              order.discount_amount
                ? `<p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Discount:</span> <span>-₹${order.discount_amount.toFixed(
                    2
                  )}</span></p>`
                : ""
            }
            ${
              order.tax_amount
                ? `<p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Tax:</span> <span>₹${order.tax_amount.toFixed(
                    2
                  )}</span></p>`
                : ""
            }
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">
            <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 16px; font-weight: bold;"><span>Total:</span> <span>₹${order.total.toFixed(
              2
            )}</span></p>
          </div>
        </div>

        <!-- Refund Information -->
        ${
          order.refund_id
            ? `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Refund Information</h3>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="margin: 5px 0;"><strong>Refund ID:</strong> ${esc(
              order.refund_id
            )}</p>
            <p style="margin: 5px 0;"><strong>Refund Amount:</strong> ₹${
              order.refund_amount?.toFixed(2) || "0.00"
            }</p>
            <p style="margin: 5px 0;"><strong>Refund Status:</strong> ${
              esc(order.refund_status || "Unknown")
            }</p>
            ${
              order.refund_reason
                ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${esc(order.refund_reason)}</p>`
                : ""
            }
            ${
              order.refunded_at
                ? `<p style="margin: 5px 0;"><strong>Refunded At:</strong> ${formatDate(
                    order.refunded_at
                  )}</p>`
                : ""
            }
          </div>
        </div>
        `
            : ""
        }

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666;">
          <p style="margin: 5px 0;">Thank you for choosing Devanagari Health Mix!</p>
          <p style="margin: 5px 0; font-size: 11px;">Generated on ${new Date().toLocaleDateString(
            "en-IN"
          )} at ${new Date().toLocaleTimeString("en-IN")}</p>
        </div>
      </div>
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-adm-forest"></div>
      </div>
    );
  }

  return (
    <div>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="adm-title"><em>Orders</em></h1>
          <p className="adm-lede">
            Manage customer orders and track fulfillment
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={fetchOrders}
            className="inline-flex items-center px-4 py-2 border border-adm-rule rounded-lg border border-adm-rule text-sm font-medium text-adm-ink-2 bg-adm-raised hover:bg-adm-sunk focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-adm-ink-3" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    {totalOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-adm-amber-ink" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    To ship
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    {pendingOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-adm-forest" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Delivered
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    {deliveredOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <IndianRupee className="h-6 w-6 text-adm-forest" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Earned
                  </dt>
                  <dd className="text-lg font-medium text-adm-ink">
                    ₹{totalRevenue.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-adm-ink-3" />
          <input
            type="text"
            placeholder="Search orders by customer name, email, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-adm-rule rounded-lg leading-5 bg-adm-raised placeholder:text-adm-ink-3 focus:outline-none focus:ring-1 focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-adm-ink-3" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-adm-rule rounded-lg leading-5 bg-adm-raised focus:outline-none focus:ring-1 focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden border border-adm-rule ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-adm-rule-soft">
                <thead className="bg-adm-sunk">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-adm-ink-3">
                      Date
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-adm-raised divide-y divide-adm-rule-soft">
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-adm-ink">
                        #{order.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-adm-rule flex items-center justify-center">
                              <User className="h-4 w-4 text-adm-ink-2" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-adm-ink">
                              {order.user?.name || "Unknown"}
                            </div>
                            <div className="text-sm text-adm-ink-3">
                              {order.user?.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-adm-ink">
                        ₹{order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
 order.status
 )}`}
                        >
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">
                            {order.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-adm-ink">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 order.payment_status === "paid"
 ? "bg-adm-sage-wash text-adm-sage-ink"
 : order.payment_status === "refunded" || order.payment_status === "failed"
 ? "bg-adm-brick-wash text-adm-brick-ink"
 : "bg-adm-amber-wash text-adm-amber-ink"
 }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-adm-ink-3">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowModal(true);
                            }}
                            className="text-adm-forest hover:text-adm-forest-deep"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {order.status !== "delivered" &&
                            order.status !== "cancelled" && (
                              <select
                                value={order.status}
                                onChange={(e) =>
                                  updateOrderStatus(order.id, e.target.value)
                                }
                                className="text-sm border border-adm-rule rounded px-2 py-1"
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-adm-ink bg-opacity-50 transition-opacity"
              onClick={() => setShowModal(false)}
            />
            <div className="inline-block align-bottom bg-adm-raised rounded-lg text-left overflow-hidden shadow-[0_24px_48px_-12px_rgba(11,33,24,0.35)] transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-adm-raised px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="adm-h2">
                    Order Details - #{selectedOrder.id.slice(-8)}
                  </h3>
                  <button
                    onClick={() => exportOrderToPDF(selectedOrder)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg border border-adm-rule text-white bg-adm-forest hover:bg-adm-forest-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="font-medium text-adm-ink mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Customer Information
                    </h4>
                    <div className="bg-adm-sunk p-4 rounded-lg">
                      <p className="mb-2">
                        <strong>Name:</strong>{" "}
                        {selectedOrder.user?.name || "Unknown"}
                      </p>
                      <p className="mb-2">
                        <Mail className="h-3 w-3 inline mr-1" />
                        <strong>Email:</strong>{" "}
                        {selectedOrder.user?.email || "No email"}
                      </p>
                    </div>
                  </div>

                  {/* Order Information */}
                  <div>
                    <h4 className="font-medium text-adm-ink mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Order Information
                    </h4>
                    <div className="bg-adm-sunk p-4 rounded-lg">
                      <p className="mb-2">
                        <strong>Order ID:</strong> #{selectedOrder.id.slice(-8)}
                      </p>
                      <p className="mb-2">
                        <strong>Total:</strong> ₹
                        {selectedOrder.total.toFixed(2)}{" "}
                        {selectedOrder.currency || "INR"}
                      </p>
                      {selectedOrder.subtotal && (
                        <p className="mb-2">
                          <strong>Subtotal:</strong> ₹
                          {selectedOrder.subtotal.toFixed(2)}
                        </p>
                      )}
                      {selectedOrder.shipping_amount && (
                        <p className="mb-2">
                          <strong>Shipping:</strong> ₹
                          {selectedOrder.shipping_amount.toFixed(2)}
                        </p>
                      )}
                      <p className="mb-2">
                        <strong>Status:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
 selectedOrder.status
 )}`}
                        >
                          {selectedOrder.status}
                        </span>
                      </p>
                      <p className="mb-2">
                        <strong>Payment:</strong> {selectedOrder.payment_status}
                      </p>
                      <p className="mb-2">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        <strong>Date:</strong>{" "}
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </p>
                      {selectedOrder.payment_id && (
                        <p className="mb-2">
                          <CreditCard className="h-3 w-3 inline mr-1" />
                          <strong>Payment ID:</strong>{" "}
                          {selectedOrder.payment_id}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium text-adm-ink mb-3 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Shipping Address
                    </h4>
                    <div className="bg-adm-sunk p-4 rounded-lg">
                      {selectedOrder.shipping_address ? (
                        <>
                          <p className="mb-2">
                            <strong>Name:</strong>{" "}
                            {selectedOrder.shipping_address.name ||
                              "Not provided"}
                          </p>
                          <p className="mb-2">
                            <Phone className="h-3 w-3 inline mr-1" />
                            <strong>Phone:</strong>{" "}
                            {selectedOrder.shipping_address.phone ||
                              "Not provided"}
                          </p>
                          <p className="mb-2">
                            <strong>Address:</strong>{" "}
                            {selectedOrder.shipping_address.address_line_1 ||
                              "Not provided"}
                          </p>
                          {selectedOrder.shipping_address.address_line_2 && (
                            <p className="mb-2 pl-4 text-adm-ink-2">
                              {selectedOrder.shipping_address.address_line_2}
                            </p>
                          )}
                          <p className="mb-2">
                            <strong>City:</strong>{" "}
                            {selectedOrder.shipping_address.city ||
                              "Not provided"}
                          </p>
                          <p className="mb-2">
                            <strong>State:</strong>{" "}
                            {selectedOrder.shipping_address.state ||
                              "Not provided"}
                          </p>
                          <p className="mb-2">
                            <strong>Pincode:</strong>{" "}
                            {selectedOrder.shipping_address.postal_code ||
                              "Not provided"}
                          </p>
                          <p className="mb-2">
                            <strong>Country:</strong>{" "}
                            {selectedOrder.shipping_address.country || "India"}
                          </p>
                        </>
                      ) : (
                        <p className="text-adm-ink-3 italic">
                          No shipping address provided
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Refund Information */}
                {selectedOrder.refund_id && (
                  <div className="mt-6">
                    <h4 className="font-medium text-adm-ink mb-3 flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refund Information
                    </h4>
                    <div className="bg-adm-brick-wash border border-adm-brick p-4 rounded-lg">
                      <p className="mb-2">
                        <strong>Refund ID:</strong> {selectedOrder.refund_id}
                      </p>
                      <p className="mb-2">
                        <strong>Refund Amount:</strong> ₹
                        {selectedOrder.refund_amount?.toFixed(2) || "0.00"}
                      </p>
                      <p className="mb-2">
                        <strong>Refund Status:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs ${
 selectedOrder.refund_status === "processed"
 ? "bg-adm-sage-wash text-adm-sage-ink"
 : selectedOrder.refund_status === "failed"
 ? "bg-adm-brick-wash text-adm-brick-ink"
 : "bg-adm-amber-wash text-adm-amber-ink"
 }`}
                        >
                          {selectedOrder.refund_status}
                        </span>
                      </p>
                      {selectedOrder.refunded_at && (
                        <p className="mb-2">
                          <strong>Refunded At:</strong>{" "}
                          {new Date(selectedOrder.refunded_at).toLocaleString()}
                        </p>
                      )}
                      {selectedOrder.refund_reason && (
                        <p className="mb-2">
                          <strong>Refund Reason:</strong>{" "}
                          {selectedOrder.refund_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h4 className="font-medium text-adm-ink mb-3 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    Order Items
                  </h4>
                  <div className="bg-adm-sunk p-4 rounded-lg">
                    {selectedOrder.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 border-b border-adm-rule last:border-b-0"
                      >
                        <div className="flex items-center flex-1">
                          <img
                            src={
                              (typeof item.product?.image_url === "string" &&
                                /^https?:\/\//i.test(item.product.image_url) &&
                                item.product.image_url) ||
                              "/src/assets/shop/ingredients.png"
                            }
                            alt={item.product?.name}
                            className="h-12 w-12 rounded-lg object-cover mr-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-adm-ink">
                              {item.product?.name || item.product_name || "Unknown Product"}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-adm-ink-3">
                              <span>Qty: {item.quantity}</span>
                              <span>
                                ₹{Number(item.product_price ?? item.price ?? 0).toFixed(2)} each
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-adm-ink">
                            ₹{item.total_price?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!selectedOrder.order_items ||
                      selectedOrder.order_items.length === 0) && (
                      <p className="text-center text-adm-ink-3 py-4">
                        No items found
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-adm-sunk px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent border border-adm-rule px-4 py-2 bg-adm-forest text-base font-medium text-white hover:bg-adm-forest-deep focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest sm:ml-3 sm:w-auto sm:text-sm"
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

export default Orders;
