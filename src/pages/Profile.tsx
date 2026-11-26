import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Package, RefreshCw, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { ordersService, Order, OrderItem } from "../services/supabase";
import BackButton from "../components/BackButton";
import ConfirmationModal from "../components/ConfirmationModal";

const Profile = () => {
  const { user } = useAuth();
  const { showError } = useNotification();
  const [orders, setOrders] = useState<
    (Order & { order_items: OrderItem[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalText, setOrderModalText] = useState<string>("");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        console.log("🔄 Fetching user orders...");
        console.log("User ID:", user.id);

        // Fetch orders from database
        const userOrders = await ordersService.getUserOrders(user.id);
        console.log("📦 Orders fetched:", userOrders.length);
        setOrders(userOrders);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        showError(
          "Order History Error",
          "Failed to load your order history. Please try again."
        );
        setOrders([]);
      } finally {
        console.log("🏁 Orders fetch completed - setting loading to false");
        setLoading(false);
      }
    };

    fetchOrders();

    // Show order success modal if present in session
    try {
      const raw = sessionStorage.getItem("orderSuccess");
      if (raw) {
        const data = JSON.parse(raw);
        const shortId = data?.id ? `#${String(data.id).slice(0, 8)}` : "";
        setOrderModalText(
          `Congratulations! Your order ${shortId} has been placed. It will be delivered in 3-4 working days.`
        );
        setShowOrderModal(true);
        sessionStorage.removeItem("orderSuccess");
      }
    } catch {}
  }, [user]);

  const refreshOrders = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      console.log("🔄 Refreshing user orders...");
      const userOrders = await ordersService.getUserOrders(user.id);
      console.log("📦 Orders refreshed:", userOrders.length);
      setOrders(userOrders);
    } catch (error) {
      console.error("❌ Error refreshing orders:", error);
      showError(
        "Refresh Error",
        "Failed to refresh order history. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-emerald-950 pt-24 min-h-screen flex items-center justify-center text-cream">
        <div className="text-center px-5">
          <h1 className="font-display text-4xl">Your profile</h1>
          <p className="mt-3 text-mist">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  const name = user.user_metadata?.full_name || "User";

  return (
    <div className="bg-emerald-950 pt-24 min-h-screen text-cream">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-12 pb-24">
        {showOrderModal && (
          <ConfirmationModal
            isOpen={showOrderModal}
            onClose={() => setShowOrderModal(false)}
            onConfirm={() => setShowOrderModal(false)}
            title="Order Placed"
            message={orderModalText}
            confirmText="OK"
            cancelText="Close"
            type="success"
          />
        )}
        <BackButton text="Back to Home" tone="dark" />

        {/* Header */}
        <div className="mt-6 sm:mt-8 mb-8 sm:mb-10 flex flex-wrap items-center justify-between gap-5 sm:gap-6">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 rounded-full object-cover ring-1 ring-gold-400/70 ring-offset-4 ring-offset-emerald-950"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`grid h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 place-items-center rounded-full bg-emerald-800 ring-1 ring-gold-400/70 ring-offset-4 ring-offset-emerald-950 ${
                user.user_metadata?.avatar_url ? "hidden" : ""
              }`}
            >
              <span className="font-display text-2xl sm:text-3xl text-gold-300">
                {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-5xl leading-[1.08] break-words">{name}</h1>
              <p className="mt-1 text-sm sm:text-[15px] text-mist break-all">{user.email}</p>
            </div>
          </div>
          <Link to="/settings" className="btn-outline-gold !py-2.5">
            <Settings size={16} strokeWidth={1.8} />
            Settings
          </Link>
        </div>

        {/* Profile information */}
        <section className="panel p-5 sm:p-7">
          <h2 className="font-display text-2xl">Profile Information</h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[13px] font-semibold text-mist">Full Name</dt>
              <dd className="mt-1 text-lg text-cream truncate">
                {user.user_metadata?.full_name || "Not provided"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] font-semibold text-mist">Email Address</dt>
              <dd className="mt-1 text-lg text-cream break-all">{user.email || "Not provided"}</dd>
            </div>
          </dl>
          <p className="mt-6 border-t border-gold-400/15 pt-5 text-sm leading-relaxed text-mist">
            <span className="font-semibold text-cream">Note:</span> Your profile information is
            automatically synced from your account. To update your name or photo, please change it
            in your account settings.
          </p>
        </section>

        {/* Addresses are managed in Settings → Address Management */}
        <div className="mt-8">
          {/* Order history */}
          <section className="panel p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl">Order History</h2>
              <button
                onClick={refreshOrders}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-gold-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gold-400/20 border-t-gold-400" />
                <p className="text-sm text-mist">Loading orders…</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <Package size={36} strokeWidth={1.4} className="mx-auto text-gold-400" />
                <p className="mt-4 text-cream">No orders yet</p>
                <Link to="/shop" className="btn-gold mt-6">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <ul className="mt-6 divide-y divide-gold-400/15 border-t border-gold-400/15">
                {orders.map((order) => (
                  <li key={order.id} className="py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg sm:text-xl text-cream tabular-nums whitespace-nowrap">
                          Order #{order.id.slice(0, 8)}
                        </h3>
                        <p className="mt-0.5 text-sm text-mist tabular-nums">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                        {order.payment_id && (
                          <p className="mt-0.5 text-xs text-mist/80 truncate">
                            Payment ID: {order.payment_id.slice(0, 20)}…
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg sm:text-xl text-gold-300 tabular-nums whitespace-nowrap">
                          ₹{order.total.toFixed(2)}
                        </div>
                        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                          <StatusChip value={order.status} />
                          {order.payment_status && <StatusChip value={order.payment_status} payment />}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 text-sm">
                      {order.order_items && order.order_items.length > 0 ? (
                        order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between gap-4 text-mist">
                            <span className="truncate">
                              {item.product_name || item.product?.name || "Product"} × {item.quantity}
                            </span>
                            <span className="tabular-nums text-cream">
                              ₹{item.product_price.toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-mist">Order items not loaded (simplified view)</div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-mist">
                        {order.payment_method && <span>Payment: {order.payment_method}</span>}
                        {order.currency && <span>Currency: {order.currency}</span>}
                      </div>
                      <Link to={`/order/${order.id}`} className="link-gold whitespace-nowrap">
                        View Details
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

// Order and payment status: a coloured dot on a quiet chip
const STATUS_DOT: Record<string, string> = {
  pending: "bg-gold-400",
  processing: "bg-gold-200",
  shipped: "bg-emerald-300",
  delivered: "bg-emerald-300",
  paid: "bg-emerald-300",
  failed: "bg-[#F0A08C]",
  cancelled: "bg-[#F0A08C]",
};

const StatusChip = ({ value, payment = false }: { value: string; payment?: boolean }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gold-400/25 px-2.5 py-0.5 text-xs font-semibold text-cream">
    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[value] ?? "bg-[#F0A08C]"}`} />
    {payment && value !== "paid"
      ? `Payment ${value}`
      : value.charAt(0).toUpperCase() + value.slice(1)}
  </span>
);

export default Profile;
