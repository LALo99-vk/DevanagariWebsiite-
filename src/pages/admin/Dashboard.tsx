import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Plus, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAdmin } from "../../context/AdminContext";
import StockPouch, { LOW_STOCK } from "../../components/admin/StockPouch";

type ShelfProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  weight: number;
  is_active?: boolean;
};

type ShelfOrder = {
  id: string;
  order_number: string | null;
  created_at: string;
  status: string;
  payment_status: string | null;
  subtotal: number;
  discount_amount: number | null;
  total: number;
  refund_status: string | null;
  order_items: { product_id: string; quantity: number; total_price: number }[];
};

type ShelfPromo = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed" | "shipping";
  discount_value: number;
  used_count: number;
  usage_limit: number | null;
  is_active: boolean;
};

const rupees = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const orderLabel = (o: ShelfOrder) => o.order_number || `#${o.id.slice(0, 8)}`;

/** Money that stayed with the shop: paid, not cancelled, not refunded. */
const counts = (o: ShelfOrder) =>
  o.payment_status === "paid" && o.status !== "cancelled";

const STATUS_CHIP: Record<string, { label: string; tone: string }> = {
  pending: { label: "To ship", tone: "adm-chip-amber" },
  processing: { label: "To ship", tone: "adm-chip-amber" },
  shipped: { label: "Shipped", tone: "adm-chip-plain" },
  delivered: { label: "Delivered", tone: "adm-chip-sage" },
  cancelled: { label: "Cancelled", tone: "adm-chip-brick" },
};

export const StatusChip = ({ status }: { status: string }) => {
  const chip = STATUS_CHIP[status] || { label: status, tone: "adm-chip-plain" };
  return <span className={`adm-chip ${chip.tone}`}>{chip.label}</span>;
};

const promoSummary = (p: ShelfPromo) => {
  const off =
    p.discount_type === "percentage"
      ? `${p.discount_value}% off`
      : p.discount_type === "fixed"
      ? `${rupees(p.discount_value)} off`
      : "Free delivery";
  const used = `used ${p.used_count} ${p.used_count === 1 ? "time" : "times"}`;
  return p.usage_limit ? `${off} · ${used} of ${p.usage_limit}` : `${off} · ${used}`;
};

/** "Health Mix 450g" → ["Health Mix", "450g"], so the size can take the italic turn. */
const splitName = (name: string) => {
  const m = name.replace(/^Devanagari\s+/i, "").match(/^(.*?)(\s+\d+\s?(?:g|kg|ml|l))$/i);
  return m ? [m[1], m[2].trim()] : [name.replace(/^Devanagari\s+/i, ""), ""];
};

const Dashboard: React.FC = () => {
  const { logAdminAction } = useAdmin();
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [orders, setOrders] = useState<ShelfOrder[]>([]);
  const [promos, setPromos] = useState<ShelfPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPromo, setBusyPromo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [p, o, pr] = await Promise.all([
      supabase.from("products").select("id, name, price, stock, weight, is_active").order("price"),
      supabase
        .from("orders")
        .select(
          "id, order_number, created_at, status, payment_status, subtotal, discount_amount, total, refund_status, order_items(product_id, quantity, total_price)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
    ]);
    if (p.error || o.error) {
      setError("The shelf could not be loaded. Check your connection and try again.");
    } else {
      setProducts((p.data as ShelfProduct[]) || []);
      setOrders((o.data as ShelfOrder[]) || []);
      setPromos((pr.data as ShelfPromo[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const shelf = useMemo(() => {
    const per = new Map<string, { units: number; earned: number; latest: ShelfOrder[] }>();
    for (const product of products) per.set(product.id, { units: 0, earned: 0, latest: [] });
    for (const order of orders) {
      const share =
        Number(order.subtotal) > 0
          ? Math.max(0, 1 - Number(order.discount_amount || 0) / Number(order.subtotal))
          : 1;
      for (const item of order.order_items || []) {
        const row = per.get(item.product_id);
        if (!row) continue;
        if (!row.latest.includes(order) && row.latest.length < 3) row.latest.push(order);
        if (!counts(order)) continue;
        row.units += item.quantity;
        row.earned += Number(item.total_price) * share;
      }
    }
    return per;
  }, [products, orders]);

  const kept = orders.filter(counts);
  const earned = kept.reduce((sum, o) => sum + Number(o.total), 0);
  const coupons = kept.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);
  const toShip = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const refundsWaiting = orders.filter((o) => o.refund_status === "pending").length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const cancelledThisMonth = orders.filter(
    (o) => o.status === "cancelled" && new Date(o.created_at) >= monthStart
  ).length;

  const togglePromo = async (promo: ShelfPromo) => {
    setBusyPromo(promo.id);
    const { error: updateError } = await supabase
      .from("promo_codes")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);
    if (!updateError) {
      setPromos((list) => list.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p)));
      await logAdminAction({
        action_type: "update",
        resource_type: "promo_code",
        resource_id: promo.id,
        old_values: { is_active: promo.is_active },
        new_values: { is_active: !promo.is_active },
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    }
    setBusyPromo(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="adm-title">
            The <em>shelf</em>
          </h1>
          <p className="adm-lede">
            Your packs: price, stock left, and what each one earned after coupons.
          </p>
        </div>
        <dl className="flex gap-8 lg:text-right">
          <div>
            <dd className="adm-num font-display text-[28px] font-normal leading-none">{loading ? "…" : rupees(earned)}</dd>
            <dt className="mt-1.5 text-[13px] font-semibold text-adm-ink-2">
              Earned{coupons > 0 ? `, after ${rupees(coupons)} coupons` : ""}
            </dt>
          </div>
          <div>
            <dd className="adm-num font-display text-[28px] font-normal leading-none">{loading ? "…" : kept.length}</dd>
            <dt className="mt-1.5 text-[13px] font-semibold text-adm-ink-2">Paid orders</dt>
          </div>
          <div>
            <dd className="adm-num font-display text-[28px] font-normal leading-none">
              <Link to="/admin/orders" className="hover:text-adm-forest">{loading ? "…" : toShip}</Link>
            </dd>
            <dt className="mt-1.5 text-[13px] font-semibold text-adm-ink-2">To ship</dt>
          </div>
        </dl>
      </div>

      {error && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-adm-brick/40 bg-adm-brick-wash px-5 py-4 text-adm-brick-ink">
          <span className="font-semibold">{error}</span>
          <button onClick={load} className="adm-btn-ghost !border-adm-brick-ink !text-adm-brick-ink">
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}

      <section aria-label="Products" className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          [0, 1, 2].map((i) => <div key={i} className="adm-panel h-[330px] animate-pulse" />)}

        {!loading &&
          products.map((product) => {
            const row = shelf.get(product.id) || { units: 0, earned: 0, latest: [] };
            const low = product.stock < LOW_STOCK;
            const [base, size] = splitName(product.name);
            return (
              <article
                key={product.id}
                className={`adm-panel grid grid-cols-[1fr_auto] gap-x-4 p-5 ${low ? "!border-adm-brick" : ""}`}
              >
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-normal leading-tight">
                    {base} {size && <em className="italic text-adm-forest">{size}</em>}
                  </h2>
                  <p className="adm-num mt-1 text-lg font-bold">
                    {rupees(product.price)}{" "}
                    <Link to={`/admin/products?edit=${product.id}`} className="adm-link ml-1 text-[13px]">
                      Edit
                    </Link>
                  </p>
                  {product.is_active === false && (
                    <span className="adm-chip adm-chip-plain mt-2">Hidden from shop</span>
                  )}
                  <dl className="mt-5 grid grid-cols-2 gap-3">
                    <div className="border-t border-adm-rule pt-2">
                      <dd className="adm-num text-lg font-bold">{row.units}</dd>
                      <dt className="text-xs font-semibold text-adm-ink-2">Units sold</dt>
                    </div>
                    <div className="border-t border-adm-rule pt-2">
                      <dd className="adm-num text-lg font-bold">{rupees(row.earned)}</dd>
                      <dt className="text-xs font-semibold text-adm-ink-2">Earned</dt>
                    </div>
                  </dl>
                </div>
                <div className="relative row-span-2">
                  <StockPouch stock={product.stock} />
                  <span className="adm-num absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-adm-ink px-2.5 text-[13px] font-bold leading-6 text-adm-paper">
                    {product.stock}
                  </span>
                  <span className="mt-1 block text-center text-xs font-semibold text-adm-ink-2">left</span>
                </div>

                {low && (
                  <p className="col-span-2 mt-4 flex items-center gap-2 rounded-lg bg-adm-brick-wash px-3 py-2 text-[13px] font-semibold text-adm-brick-ink">
                    <AlertTriangle size={15} />
                    {product.stock === 0 ? "Out of stock. Customers can't order it." : `Only ${product.stock} left. Restock soon.`}
                  </p>
                )}

                <div className="col-span-2 mt-4 border-t border-adm-rule pt-3">
                  <h3 className="mb-1 text-xs font-bold text-adm-ink-2">Latest orders</h3>
                  {row.latest.length === 0 ? (
                    <p className="py-1.5 text-sm text-adm-ink-3">No orders yet</p>
                  ) : (
                    <ul>
                      {row.latest.map((order) => (
                        <li key={order.id}>
                          <Link
                            to={`/admin/orders?order=${order.id}`}
                            className="flex items-center justify-between gap-3 border-b border-adm-rule-soft py-1.5 text-sm last:border-0 hover:text-adm-forest"
                          >
                            <span className="adm-num truncate">
                              {orderLabel(order)} · {shortDate(order.created_at)}
                            </span>
                            <StatusChip status={order.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}

        {!loading && !error && products.length === 0 && (
          <div className="adm-panel col-span-full p-8 text-center">
            <p className="font-display text-xl">The shelf is empty</p>
            <p className="mt-1 text-adm-ink-2">Add your first pack and it will appear here.</p>
            <Link to="/admin/products?new=1" className="adm-btn mt-4">
              <Plus size={16} /> Add product
            </Link>
          </div>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="adm-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="adm-h2">Promo codes</h2>
            <Link to="/admin/promo-codes" className="adm-link text-sm">
              All codes
            </Link>
          </div>
          {!loading && promos.length === 0 && (
            <p className="mt-3 border-t border-adm-rule-soft pt-3 text-sm text-adm-ink-3">No promo codes yet.</p>
          )}
          <ul className="mt-2">
            {promos.slice(0, 4).map((promo) => (
              <li
                key={promo.id}
                className="grid grid-cols-[minmax(7rem,auto)_1fr_auto] items-center gap-4 border-t border-adm-rule-soft py-2.5 text-sm"
              >
                <span className={`font-bold tracking-[0.02em] ${promo.is_active ? "" : "text-adm-ink-3 line-through"}`}>
                  {promo.code}
                </span>
                <span className="adm-num text-adm-ink-2">{promoSummary(promo)}</span>
                <button
                  onClick={() => togglePromo(promo)}
                  disabled={busyPromo === promo.id}
                  className="adm-btn-ghost !px-3 !py-1.5 text-[13px]"
                >
                  {promo.is_active ? "Pause" : "Turn on"}
                </button>
              </li>
            ))}
          </ul>
          <Link to="/admin/promo-codes?new=1" className="adm-btn mt-3">
            <Plus size={16} /> New promo code
          </Link>
        </section>

        <section className="adm-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="adm-h2">Refunds</h2>
            <Link to="/admin/refunds" className="adm-link text-sm">
              Open refunds
            </Link>
          </div>
          <dl className="mt-2 text-sm">
            <div className="flex justify-between border-t border-adm-rule-soft py-2.5">
              <dt>Refunds in progress</dt>
              <dd className={`adm-num font-bold ${refundsWaiting ? "text-adm-amber-ink" : ""}`}>{refundsWaiting}</dd>
            </div>
            <div className="flex justify-between border-t border-adm-rule-soft py-2.5">
              <dt>Cancelled this month</dt>
              <dd className="adm-num font-bold">{cancelledThisMonth}</dd>
            </div>
          </dl>
          <Link to="/admin/orders" className="adm-link mt-3 inline-flex items-center gap-1.5 text-sm">
            Go to orders <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
