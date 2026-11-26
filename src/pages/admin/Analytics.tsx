import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  IndianRupee,
  Package,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
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
          subtotal,
          discount_amount,
          status,
          payment_status,
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
          total_price,
          order_id,
          product:products(name)
        `
        )
        .in("order_id", ordersData?.map((o) => o.id) || []);

      if (orderItemsError) throw orderItemsError;

      // Earned = what customers paid and the shop kept: paid orders that were
      // not cancelled or refunded (refunds set payment_status to "refunded").
      // The shelf and the orders page use the same rule.
      const earns = (order: { status: string; payment_status?: string | null }) =>
        order.payment_status === "paid" && order.status !== "cancelled";

      const totalRevenue =
        ordersData
          ?.filter(earns)
          .reduce((sum, order) => sum + Number(order.total), 0) || 0;

      const totalOrders = ordersData?.length || 0;
      const totalUsers = usersData?.length || 0;
      const totalProducts = productsData?.length || 0;

      // Calculate growth (simplified - compare with previous period)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);

      const { data: prevOrdersData } = await supabase
        .from("orders")
        .select("total, status, payment_status, created_at")
        .gte("created_at", previousStartDate.toISOString())
        .lt("created_at", startDate.toISOString());

      const prevRevenue =
        prevOrdersData
          ?.filter(earns)
          .reduce((sum, order) => sum + Number(order.total), 0) || 0;

      const prevOrdersCount = prevOrdersData?.length || 0;

      const revenueGrowth =
        prevRevenue > 0
          ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
          : 0;
      const ordersGrowth =
        prevOrdersCount > 0
          ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100
          : 0;

      // Top products: same orders as total revenue (earned), and each item's
      // share of the order's coupon discount is taken off, so this is what the
      // customer actually paid for it.
      const deliveredOrders = new Map(
        (ordersData || [])
          .filter(earns)
          .map((order) => [order.id, order])
      );
      const productStats = new Map();
      orderItemsData?.forEach((item) => {
        const order = deliveredOrders.get(item.order_id);
        if (!order) return;
        const subtotal = Number(order.subtotal) || 0;
        const discount = Number(order.discount_amount) || 0;
        const paidShare = subtotal > 0 ? Math.max(0, 1 - discount / subtotal) : 1;
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
        stats.total_revenue += Number(item.total_price) * paidShare;
      });

      const topProducts = Array.from(productStats.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      // Monthly earnings for the last 12 months, whatever range is picked above.
      const yearStart = new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1);
      const { data: yearOrders } = await supabase
        .from("orders")
        .select("total, status, payment_status, created_at")
        .gte("created_at", yearStart.toISOString());
      const monthlyRevenue = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

        const monthOrders =
          yearOrders?.filter((order) => {
            const orderDate = new Date(order.created_at);
            return orderDate >= monthStart && orderDate < monthEnd && earns(order);
          }) || [];

        const monthRevenue = monthOrders.reduce(
          (sum, order) => sum + Number(order.total),
          0
        );

        monthlyRevenue.push({
          month: date.toLocaleDateString("en-IN", {
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
      <TrendingUp className="h-4 w-4 text-adm-sage-ink" />
    ) : (
      <TrendingDown className="h-4 w-4 text-adm-brick" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-adm-forest"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-adm-ink-3">No analytics data available</p>
      </div>
    );
  }

  return (
    <div>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="adm-title"><em>Earnings</em></h1>
          <p className="adm-lede">
            Business insights and performance metrics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-adm-rule rounded-lg leading-5 bg-adm-raised focus:outline-none focus:ring-1 focus:ring-adm-forest focus:border-adm-forest sm:text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center px-4 py-2 border border-adm-rule rounded-lg border border-adm-rule text-sm font-medium text-adm-ink-2 bg-adm-raised hover:bg-adm-sunk focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-adm-forest"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-adm-ink">
                      ₹{analytics.totalRevenue.toFixed(2)}
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

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-adm-forest" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Total Orders
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-adm-ink">
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

        <div className="bg-adm-raised overflow-hidden border border-adm-rule rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-adm-forest" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Total Users
                  </dt>
                  <dd className="text-2xl font-semibold text-adm-ink">
                    {analytics.totalUsers}
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
                <Package className="h-6 w-6 text-adm-amber-ink" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-adm-ink-3 truncate">
                    Total Products
                  </dt>
                  <dd className="text-2xl font-semibold text-adm-ink">
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
        <div className="bg-adm-raised border border-adm-rule rounded-lg p-6">
          <h3 className="adm-h2 mb-4">
            Monthly Revenue
          </h3>
          <div className="space-y-3">
            {analytics.monthlyRevenue.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-adm-ink-2">{month.month}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-adm-rule-soft rounded-full h-2">
                    <div
                      className="bg-adm-forest h-2 rounded-full"
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
                  <span className="text-sm font-medium text-adm-ink">
                    ₹{month.revenue.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-adm-raised border border-adm-rule rounded-lg p-6">
          <h3 className="adm-h2 mb-4">
            Order Status Distribution
          </h3>
          <div className="space-y-3">
            {analytics.orderStatusDistribution.map((status, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-adm-ink-2 capitalize">
                  {status.status}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-adm-rule-soft rounded-full h-2">
                    <div
                      className="bg-adm-forest h-2 rounded-full"
                      style={{
                        width: `${
                          (status.count / analytics.totalOrders) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-adm-ink">
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
        <div className="bg-adm-raised border border-adm-rule rounded-lg">
          <div className="px-6 py-4 border-b border-adm-rule">
            <h3 className="adm-h2">Top Products</h3>
          </div>
          <div className="divide-y divide-adm-rule-soft">
            {analytics.topProducts.map((product, index) => (
              <div key={product.product_id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-adm-rule flex items-center justify-center">
                        <span className="text-sm font-medium text-adm-ink-2">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-adm-ink">
                        {product.name}
                      </div>
                      <div className="text-sm text-adm-ink-3">
                        {product.total_quantity} units sold
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-adm-ink">
                    ₹{product.total_revenue.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-adm-raised border border-adm-rule rounded-lg">
          <div className="px-6 py-4 border-b border-adm-rule">
            <h3 className="adm-h2">Recent Orders</h3>
          </div>
          <div className="divide-y divide-adm-rule-soft">
            {analytics.recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-adm-ink">
                      {order.user?.name || "Unknown Customer"}
                    </div>
                    <div className="text-sm text-adm-ink-3">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-adm-ink">
                    ₹{order.total.toFixed(2)}
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
