import React, { useState, useEffect } from "react";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  Menu,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";
import { mockAdminData, simulateDbDelay } from "../../utils/mockData";
import { supabaseRestApi } from "../../utils/supabaseRestApi";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  recentOrders: any[];
  recentUsers: any[];
  recentActions: any[];
}

const Dashboard: React.FC = () => {
  const { adminActions } = useAdmin();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    recentOrders: [],
    recentUsers: [],
    recentActions: [],
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching dashboard data...");

      // Try authenticated Supabase client first (bypasses RLS issues)
      try {
        console.log(
          "📡 Using authenticated Supabase client to fetch real data..."
        );

        // Get products count
        const { count: productsCount, error: productsError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        if (productsError) throw productsError;

        // Get orders with user data
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(
            `
            *,
            user:users(name,email),
            order_items(*,product:products(name,image_url))
          `
          )
          .order("created_at", { ascending: false });

        if (ordersError) throw ordersError;

        // Get users count
        const { count: usersCount, error: usersError } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        if (usersError) throw usersError;

        // Get recent users
        const { data: recentUsers, error: recentUsersError } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentUsersError) throw recentUsersError;

        const recentOrders = ordersData?.slice(0, 5) || [];

        console.log("✅ Dashboard data loaded from authenticated Supabase");

        // Calculate total revenue
        const totalRevenue = (ordersData || [])
          .filter((order: any) => order.status === "delivered")
          .reduce((sum: number, order: any) => sum + order.total, 0);

        console.log(
          "✅ Dashboard data loaded (real data from authenticated Supabase)"
        );
        setStats({
          totalProducts: productsCount || 0,
          totalOrders: ordersData?.length || 0,
          totalUsers: usersCount || 0,
          totalRevenue,
          recentOrders: recentOrders,
          recentUsers: recentUsers || [],
          recentActions: adminActions.slice(0, 5),
        });
      } catch (supabaseError) {
        console.warn(
          "⚠️ Authenticated Supabase failed, trying REST API:",
          supabaseError
        );

        // Fallback to REST API
        try {
          console.log("📡 Using REST API as fallback...");

          const [
            productsCount,
            ordersData,
            usersCount,
            recentOrders,
            recentUsers,
          ] = await Promise.all([
            supabaseRestApi.getProductsCount(),
            supabaseRestApi.getOrders(),
            supabaseRestApi.getUsersCount(),
            supabaseRestApi.getOrders().then((orders) => orders.slice(0, 5)),
            supabaseRestApi.getUsers().then((users) => users.slice(0, 5)),
          ]);

          console.log("✅ Dashboard data loaded from REST API");

          // Calculate total revenue
          const totalRevenue = ordersData
            .filter((order: any) => order.status === "delivered")
            .reduce((sum: number, order: any) => sum + order.total, 0);

          console.log("✅ Dashboard data loaded (real data from REST API)");
          setStats({
            totalProducts: productsCount,
            totalOrders: ordersData.length,
            totalUsers: usersCount,
            totalRevenue,
            recentOrders: recentOrders,
            recentUsers: recentUsers,
            recentActions: adminActions.slice(0, 5),
          });
        } catch (restApiError) {
          console.warn(
            "⚠️ REST API also failed, using mock data:",
            restApiError
          );

          // Fallback to mock data
          console.log("📦 Using mock data as fallback");
          await simulateDbDelay(500);

          setStats({
            totalProducts: mockAdminData.products.count,
            totalOrders: mockAdminData.orders.count,
            totalUsers: mockAdminData.users.count,
            totalRevenue: 0,
            recentOrders: mockAdminData.orders.data,
            recentUsers: mockAdminData.users.data,
            recentActions: adminActions.slice(0, 5),
          });
        }
      }
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      // Set default values on error
      setStats({
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0,
        recentOrders: [],
        recentUsers: [],
        recentActions: adminActions.slice(0, 5),
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-900"
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

      <div className="mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Overview of your e-commerce platform
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Products
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalProducts}
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
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalOrders}
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
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalUsers}
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
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Orders
            </h3>
            <div className="flow-root">
              {stats.recentOrders.length > 0 ? (
                <ul className="-my-5 divide-y divide-gray-200">
                  {stats.recentOrders.map((order) => (
                    <li key={order.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <ShoppingCart className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {order.users?.name || order.users?.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(order.total)}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No recent orders
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Orders will appear here once customers start placing them.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Users
            </h3>
            <div className="flow-root">
              {stats.recentUsers.length > 0 ? (
                <ul className="-my-5 divide-y divide-gray-200">
                  {stats.recentUsers.map((user) => (
                    <li key={user.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.name || user.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No recent users
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    New user registrations will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Admin Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Actions
            </h3>
            <div className="flow-root">
              {stats.recentActions.length > 0 ? (
                <ul className="-my-5 divide-y divide-gray-200">
                  {stats.recentActions.map((action) => (
                    <li key={action.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {action.action_type} {action.resource_type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(action.created_at)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No recent actions
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Admin actions will appear here as you manage the system.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
