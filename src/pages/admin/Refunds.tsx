import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Menu,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";
import { mockAdminData, simulateDbDelay } from "../../utils/mockData";
import { supabaseRestApi } from "../../utils/supabaseRestApi";

interface RefundOrder {
  id: string;
  user_id: string;
  total: number;
  status: string;
  payment_status: string;
  payment_id?: string | null;
  refund_id?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refund_status?: "pending" | "processed" | "failed" | null;
  refunded_at?: string | null;
  created_at: string;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

const Refunds: React.FC = () => {
  const { logAdminAction } = useAdmin();
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRefund, setSelectedRefund] = useState<RefundOrder | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching refunds from database...");

      // Use authenticated Supabase client (consistent with other admin components)
      try {
        console.log(
          "📡 Using authenticated Supabase client to fetch refunds..."
        );

        // Get orders with refund_id OR cancelled status
        const { data: refunds, error } = await supabase
          .from("orders")
          .select(
            `
            *,
            user:users(name,email)
          `
          )
          .or("refund_id.not.is.null,status.eq.cancelled")
          .order("refunded_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ Error fetching refunds:", error);
          throw error;
        }

        console.log(
          "✅ Refunds loaded (real data from Supabase client):",
          refunds?.length || 0,
          "refunds"
        );

        // Log detailed refund information for debugging
        if (refunds && refunds.length > 0) {
          console.log("💰 Refunds details:");
          refunds.forEach((refund, index) => {
            console.log(`  ${index + 1}. Order ${refund.id}:`, {
              status: refund.status,
              payment_status: refund.payment_status,
              refund_id: refund.refund_id,
              refund_status: refund.refund_status,
              refund_amount: refund.refund_amount,
              user: refund.user?.name || refund.user?.email || "Unknown",
              created_at: refund.created_at,
            });
          });
        } else {
          console.log("⚠️ No refunds found in database");
          console.log("💡 This could mean:");
          console.log("   - No orders have been cancelled yet");
          console.log("   - No orders have refund_id set");
          console.log("   - The refunds query is not working correctly");
        }

        setRefunds(refunds || []);
      } catch (supabaseError) {
        console.warn(
          "⚠️ Supabase client failed, trying REST API fallback:",
          supabaseError
        );

        try {
          console.log("📡 Using REST API as fallback...");
          const refunds = await supabaseRestApi.getRefunds();
          console.log(
            "✅ Refunds loaded from REST API fallback:",
            refunds.length,
            "refunds"
          );
          setRefunds(refunds);
        } catch (restApiError) {
          console.warn(
            "⚠️ REST API also failed, using mock data:",
            restApiError
          );

          // Final fallback to mock data
          console.log("📦 Using mock data as final fallback");
          await simulateDbDelay(300);
          setRefunds(mockAdminData.refunds.data);
        }
      }
    } catch (error) {
      console.error("Error fetching refunds:", error);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const getRefundStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRefundStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case "processed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredRefunds = refunds.filter((refund) => {
    const matchesSearch =
      refund.refund_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      refund.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      refund.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      refund.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesStatus =
      statusFilter === "all" || refund.refund_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Convert INR refund amounts to USD for display
  const usdToInrRate = 83; // Same rate used in Razorpay service
  const totalRefundAmount = refunds.reduce((sum, refund) => {
    const refundAmount = refund.refund_amount || 0;
    // If the amount seems to be in INR (large values), convert to USD
    if (refundAmount > 100) {
      return sum + refundAmount / usdToInrRate;
    }
    // If it's already in USD (small values), use as is
    return sum + refundAmount;
  }, 0);

  const processedRefunds = refunds.filter(
    (refund) => refund.refund_status === "processed"
  ).length;

  const pendingRefunds = refunds.filter(
    (refund) => refund.refund_status === "pending"
  ).length;

  const failedRefunds = refunds.filter(
    (refund) => refund.refund_status === "failed"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-900"
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Refund Management
          </h1>
          <p className="text-gray-600">
            Manage and track order refunds and their status
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Refunded
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalRefundAmount.toFixed(2)} USD
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-gray-900">
                {processedRefunds}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <RefreshCw className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingRefunds}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">
                {failedRefunds}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search refunds by ID, customer, or payment ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refund ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Refunded At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRefunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {refund.refund_id
                      ? `${refund.refund_id.slice(0, 12)}...`
                      : "N/A"}
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
                          {refund.user?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {refund.user?.email || "No email"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $
                    {(() => {
                      const amount = refund.refund_amount || 0;
                      // Convert INR to USD if amount seems to be in INR
                      const displayAmount =
                        amount > 100 ? amount / usdToInrRate : amount;
                      return displayAmount.toFixed(2);
                    })()}{" "}
                    USD
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRefundStatusColor(
                        refund.refund_status
                      )}`}
                    >
                      {getRefundStatusIcon(refund.refund_status)}
                      <span className="ml-1 capitalize">
                        {refund.refund_status || "unknown"}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {refund.refunded_at
                      ? new Date(refund.refunded_at).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedRefund(refund);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Details Modal */}
      {showModal && selectedRefund && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowModal(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Refund Details -{" "}
                  {selectedRefund.refund_id
                    ? `${selectedRefund.refund_id.slice(0, 12)}...`
                    : "N/A"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Customer Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Name:</strong>{" "}
                        {selectedRefund.user?.name || "Unknown"}
                      </p>
                      <p>
                        <strong>Email:</strong>{" "}
                        {selectedRefund.user?.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Refund Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Refund ID:</strong>{" "}
                        {selectedRefund.refund_id || "N/A"}
                      </p>
                      <p>
                        <strong>Amount:</strong> $
                        {(() => {
                          const amount = selectedRefund.refund_amount || 0;
                          // Convert INR to USD if amount seems to be in INR
                          const displayAmount =
                            amount > 100 ? amount / usdToInrRate : amount;
                          return displayAmount.toFixed(2);
                        })()}{" "}
                        USD
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded text-xs ${getRefundStatusColor(
                            selectedRefund.refund_status
                          )}`}
                        >
                          {selectedRefund.refund_status}
                        </span>
                      </p>
                      <p>
                        <strong>Reason:</strong>{" "}
                        {selectedRefund.refund_reason || "N/A"}
                      </p>
                      <p>
                        <strong>Refunded At:</strong>{" "}
                        {selectedRefund.refunded_at
                          ? new Date(
                              selectedRefund.refunded_at
                            ).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Order Information
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p>
                      <strong>Order ID:</strong> {selectedRefund.id}
                    </p>
                    <p>
                      <strong>Payment ID:</strong> {selectedRefund.payment_id}
                    </p>
                    <p>
                      <strong>Original Amount:</strong> $
                      {(() => {
                        const amount = selectedRefund.total || 0;
                        // Convert INR to USD if amount seems to be in INR
                        const displayAmount =
                          amount > 100 ? amount / usdToInrRate : amount;
                        return displayAmount.toFixed(2);
                      })()}{" "}
                      USD
                    </p>
                    <p>
                      <strong>Order Status:</strong> {selectedRefund.status}
                    </p>
                    <p>
                      <strong>Payment Status:</strong>{" "}
                      {selectedRefund.payment_status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowModal(false)}
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

export default Refunds;
