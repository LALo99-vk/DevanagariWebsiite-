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
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";
import { mockAdminData, simulateDbDelay } from "../../utils/mockData";
import { supabaseRestApi } from "../../utils/supabaseRestApi";

interface Order {
  id: string;
  user_id: string;
  total: number;
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  payment_method: string;
  currency: string;
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
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Order Details - #{selectedOrder.id.slice(-8)}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Customer Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Name:</strong>{" "}
                        {selectedOrder.user?.name || "Unknown"}
                      </p>
                      <p>
                        <strong>Email:</strong>{" "}
                        {selectedOrder.user?.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Order Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Total:</strong> $
                        {selectedOrder.total.toFixed(2)}{" "}
                        {selectedOrder.currency || "USD"}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                            selectedOrder.status
                          )}`}
                        >
                          {selectedOrder.status}
                        </span>
                      </p>
                      <p>
                        <strong>Payment:</strong> {selectedOrder.payment_status}
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </p>
                      {selectedOrder.refund_id && (
                        <>
                          <p>
                            <strong>Refund ID:</strong>{" "}
                            {selectedOrder.refund_id}
                          </p>
                          <p>
                            <strong>Refund Amount:</strong> $
                            {(() => {
                              const amount = selectedOrder.refund_amount || 0;
                              // Convert INR to USD if amount seems to be in INR
                              const usdToInrRate = 83;
                              const displayAmount =
                                amount > 100 ? amount / usdToInrRate : amount;
                              return displayAmount.toFixed(2);
                            })()}{" "}
                            {selectedOrder.currency || "USD"}
                          </p>
                          <p>
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
                            <p>
                              <strong>Refunded At:</strong>{" "}
                              {new Date(
                                selectedOrder.refunded_at
                              ).toLocaleString()}
                            </p>
                          )}
                          {selectedOrder.refund_reason && (
                            <p>
                              <strong>Refund Reason:</strong>{" "}
                              {selectedOrder.refund_reason}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Order Items
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedOrder.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="flex items-center">
                          <img
                            src={
                              item.product?.image_url ||
                              "/src/assets/shop/First page Flipkart.png"
                            }
                            alt={item.product?.name}
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                          />
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-sm text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <p className="font-medium">
                          ₹{item.total_price.toFixed(2)}{" "}
                          {selectedOrder.currency || "INR"}
                        </p>
                      </div>
                    ))}
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
