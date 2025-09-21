import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
  Menu,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { supabase } from "../../lib/supabaseClient";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
  recentOrders: Array<{
    id: string;
    total: number;
    created_at: string;
    user: { name: string; email: string };
  }>;
  topProducts: Array<{
    product_id: string;
    name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  orderStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
}

const Analytics: React.FC = () => {
  const { logAdminAction } = useAdmin();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30"); // days
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          total,
          status,
          created_at,
          user:users(name, email)
        `
        )
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch users data
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, created_at")
        .gte("created_at", startDate.toISOString());

      if (usersError) throw usersError;

      // Fetch products data
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name");

      if (productsError) throw productsError;

      // Fetch order items for top products
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from("order_items")
        .select(
          `
          product_id,
          quantity,
          price,
          order_id,
          product:products(name)
        `
        )
        .in("order_id", ordersData?.map((o) => o.id) || []);

      if (orderItemsError) throw orderItemsError;

      // Calculate analytics
      const totalRevenue =
        ordersData
          ?.filter((order) => order.status === "delivered")
          .reduce((sum, order) => sum + order.total, 0) || 0;

      const totalOrders = ordersData?.length || 0;
      const totalUsers = usersData?.length || 0;
      const totalProducts = productsData?.length || 0;

      // Calculate growth (simplified - compare with previous period)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);

      const { data: prevOrdersData } = await supabase
        .from("orders")
        .select("total, status, created_at")
        .gte("created_at", previousStartDate.toISOString())
        .lt("created_at", startDate.toISOString());

      const prevRevenue =
        prevOrdersData
          ?.filter((order) => order.status === "delivered")
          .reduce((sum, order) => sum + order.total, 0) || 0;

      const prevOrdersCount = prevOrdersData?.length || 0;

      const revenueGrowth =
        prevRevenue > 0
          ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
          : 0;
      const ordersGrowth =
        prevOrdersCount > 0
          ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100
          : 0;

      // Top products
      const productStats = new Map();
      orderItemsData?.forEach((item) => {
        const key = item.product_id;
        if (!productStats.has(key)) {
          productStats.set(key, {
            product_id: key,
            name: item.product?.name || "Unknown",
            total_quantity: 0,
            total_revenue: 0,
          });
        }
        const stats = productStats.get(key);
        stats.total_quantity += item.quantity;
        stats.total_revenue += item.total_price;
      });

      const topProducts = Array.from(productStats.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      // Monthly revenue (simplified)
      const monthlyRevenue = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthOrders =
          ordersData?.filter((order) => {
            const orderDate = new Date(order.created_at);
            return (
              orderDate >= monthStart &&
              orderDate <= monthEnd &&
              order.status === "delivered"
            );
          }) || [];

        const monthRevenue = monthOrders.reduce(
          (sum, order) => sum + order.total,
          0
        );

        monthlyRevenue.push({
          month: date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          }),
          revenue: monthRevenue,
        });
      }

      // Order status distribution
      const statusCounts = new Map();
      ordersData?.forEach((order) => {
        const status = order.status;
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });

      const orderStatusDistribution = Array.from(statusCounts.entries()).map(
        ([status, count]) => ({
          status,
          count,
        })
      );

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalUsers,
        totalProducts,
        revenueGrowth,
        ordersGrowth,
        usersGrowth: 0, // Simplified for now
        recentOrders: ordersData?.slice(0, 10) || [],
        topProducts,
        monthlyRevenue,
        orderStatusDistribution,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
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
              className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-900"
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Business insights and performance metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ₹{analytics.totalRevenue.toFixed(2)} INR
                    </div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${getGrowthColor(
                        analytics.revenueGrowth
                      )}`}
                    >
                      {getGrowthIcon(analytics.revenueGrowth)}
                      <span className="ml-1">
                        {Math.abs(analytics.revenueGrowth).toFixed(1)}%
                      </span>
                    </div>
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
                <ShoppingCart className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {analytics.totalOrders}
                    </div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${getGrowthColor(
                        analytics.ordersGrowth
                      )}`}
                    >
                      {getGrowthIcon(analytics.ordersGrowth)}
                      <span className="ml-1">
                        {Math.abs(analytics.ordersGrowth).toFixed(1)}%
                      </span>
                    </div>
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
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {analytics.totalUsers}
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
                <Package className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Products
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {analytics.totalProducts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Monthly Revenue
          </h3>
          <div className="space-y-3">
            {analytics.monthlyRevenue.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{month.month}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (month.revenue /
                            Math.max(
                              ...analytics.monthlyRevenue.map((m) => m.revenue)
                            )) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    ${month.revenue.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Order Status Distribution
          </h3>
          <div className="space-y-3">
            {analytics.orderStatusDistribution.map((status, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {status.status}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${
                          (status.count / analytics.totalOrders) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {status.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products and Recent Orders */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Products</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {analytics.topProducts.map((product, index) => (
              <div key={product.product_id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.total_quantity} units sold
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ₹{product.total_revenue.toFixed(2)} INR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {analytics.recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {order.user?.name || "Unknown Customer"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ₹{order.total.toFixed(2)} INR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
