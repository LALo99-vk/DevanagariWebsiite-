import React, { useState, useEffect } from "react";
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
  DollarSign,
  RefreshCw,
  Clock,
  Menu,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

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
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "shipped":
        return <Truck className="h-4 w-4 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "refunded":
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const totalRevenue = orders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + order.total, 0);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
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
              getStatusColor(order.status).includes("green")
                ? "#059669"
                : getStatusColor(order.status).includes("red")
                ? "#dc2626"
                : "#d97706"
            };">${order.status}</span></p>
            <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="text-transform: capitalize; color: ${
              order.payment_status === "paid" ? "#059669" : "#d97706"
            };">${order.payment_status}</span></p>
          </div>
          <div>
            <h3 style="color: #333; margin: 0 0 10px 0;">Payment Details</h3>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${
              order.payment_method
            }</p>
            ${
              order.payment_id
                ? `<p style="margin: 5px 0;"><strong>Payment ID:</strong> ${order.payment_id}</p>`
                : ""
            }
            <p style="margin: 5px 0;"><strong>Currency:</strong> ${
              order.currency
            }</p>
          </div>
        </div>

        <!-- Customer Information -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Customer Information</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Name:</strong> ${
              order.user?.name || "Unknown"
            }</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${
              order.user?.email || "No email"
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
              order.shipping_address.name || "Not provided"
            }</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${
              order.shipping_address.phone || "Not provided"
            }</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${
              order.shipping_address.address_line_1 || "Not provided"
            }</p>
            ${
              order.shipping_address.address_line_2
                ? `<p style="margin: 5px 0;">${order.shipping_address.address_line_2}</p>`
                : ""
            }
            <p style="margin: 5px 0;">${order.shipping_address.city || ""}, ${
                order.shipping_address.state || ""
              } ${order.shipping_address.postal_code || ""}</p>
            <p style="margin: 5px 0;"><strong>Country:</strong> ${
              order.shipping_address.country || "India"
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
                    <strong>${item.product?.name || "Unknown Product"}</strong>
                  </td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: center;">${
                    item.quantity
                  }</td>
                  <td style="border: 1px solid #e5e7eb; padding: 12px; text-align: right;">₹${
                    item.price?.toFixed(2) || "0.00"
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
            <p style="margin: 5px 0;"><strong>Refund ID:</strong> ${
              order.refund_id
            }</p>
            <p style="margin: 5px 0;"><strong>Refund Amount:</strong> ₹${
              order.refund_amount?.toFixed(2) || "0.00"
            }</p>
            <p style="margin: 5px 0;"><strong>Refund Status:</strong> ${
              order.refund_status || "Unknown"
            }</p>
            ${
              order.refund_reason
                ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${order.refund_reason}</p>`
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            <a
              href="/"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-b border-gray-200 mb-2"
            >
              🏠 Return to Home
            </a>
            <a
              href="/admin"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              📊 Dashboard
            </a>
            <a
              href="/admin/products"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              📦 Products
            </a>
            <a
              href="/admin/orders"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-900"
            >
              🛒 Orders
            </a>
            <a
              href="/admin/users"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              👥 Users
            </a>
            <a
              href="/admin/analytics"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              📈 Analytics
            </a>
            <a
              href="/admin/refunds"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              💰 Refunds
            </a>
            <a
              href="/admin/settings"
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              ⚙️ Settings
            </a>
          </nav>
        </div>
      </div>

      {/* Hamburger button */}
      <div className="mb-6">
        <button
          type="button"
          className="lg:hidden -m-2.5 p-2.5 text-gray-700"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customer orders and track fulfillment
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={fetchOrders}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {pendingOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Delivered
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {deliveredOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ₹{totalRevenue.toFixed(2)} INR
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders by customer name, email, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {order.user?.name || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.user?.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.total.toFixed(2)} {order.currency || "INR"}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.payment_status === "paid"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              console.log(
                                "🔍 Eye button clicked for order:",
                                order
                              );
                              setSelectedOrder(order);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
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
                                className="text-sm border border-gray-300 rounded px-2 py-1"
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
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Order Details - #{selectedOrder.id.slice(-8)}
                  </h3>
                  <button
                    onClick={() => exportOrderToPDF(selectedOrder)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Customer Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
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
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Order Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
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
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Shipping Address
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
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
                            <p className="mb-2 pl-4 text-gray-600">
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
                        <p className="text-gray-500 italic">
                          No shipping address provided
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Refund Information */}
                {selectedOrder.refund_id && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refund Information
                    </h4>
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
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
                              ? "bg-green-100 text-green-800"
                              : selectedOrder.refund_status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
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
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    Order Items
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedOrder.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
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
                            <p className="font-medium text-gray-900">
                              {item.product?.name || "Unknown Product"}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Qty: {item.quantity}</span>
                              <span>
                                ₹{item.price?.toFixed(2) || "0.00"} each
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            ₹{item.total_price?.toFixed(2) || "0.00"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedOrder.currency || "INR"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!selectedOrder.order_items ||
                      selectedOrder.order_items.length === 0) && (
                      <p className="text-center text-gray-500 py-4">
                        No items found
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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

export default Orders;
