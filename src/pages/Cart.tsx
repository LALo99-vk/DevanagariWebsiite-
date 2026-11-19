import { useState } from "react";
import placeholderImg from "../assets/shop/ingredients.png";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import CheckoutModal from "../components/CheckoutModal";

const rupees = (n: number) => `₹${n.toFixed(2)}`;

// Centred message used for the signed-out and empty states
const CartMessage = ({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) => (
  <div className="bg-emerald-950 pt-24 min-h-screen text-cream">
    <div className="mx-auto max-w-xl px-5 sm:px-8 py-24 text-center">
      <ShoppingBag size={44} strokeWidth={1.4} className="mx-auto text-gold-400" />
      <h1 className="mt-6 font-display text-4xl sm:text-5xl leading-[1.08]">{title}</h1>
      <p className="mt-4 text-[17px] leading-[1.7] text-mist">{text}</p>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">{children}</div>
    </div>
  </div>
);

const Cart = () => {
  const {
    items: cartItems,
    updateQty,
    removeItem,
    totalItems,
    totalPrice,
    loading,
  } = useCart();
  const { user, loginWithGoogle } = useAuth();
  const { showError } = useNotification();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const changeQty = async (itemId: string, quantity: number) => {
    try {
      await updateQty(itemId, quantity);
    } catch (error) {
      showError(
        "Couldn't update quantity",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const remove = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch {
      showError("Couldn't remove item", "Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="bg-emerald-950 pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-gold-400/20 border-t-gold-400" />
          <p className="text-sm text-mist">Loading your cart…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <CartMessage
        title="Sign in to view your cart"
        text="Please sign in to view your cart and manage your items."
      >
        <button
          onClick={() =>
            loginWithGoogle().catch(() =>
              showError("Sign-in failed", "Please try again in a moment.")
            )
          }
          className="btn-gold !px-7 !py-3.5 !text-[15px]"
        >
          Sign in with Google
        </button>
        <Link to="/shop" className="btn-outline-gold !px-7 !py-3.5 !text-[15px]">
          <ArrowLeft size={17} />
          Continue Shopping
        </Link>
      </CartMessage>
    );
  }

  if (cartItems.length === 0) {
    return (
      <CartMessage
        title="Your cart is empty"
        text="Looks like you haven't added any items to your cart yet."
      >
        <Link to="/shop" className="btn-gold !px-7 !py-3.5 !text-[15px]">
          <ArrowLeft size={17} />
          Continue Shopping
        </Link>
      </CartMessage>
    );
  }

  return (
    <div className="bg-emerald-950 pt-24 min-h-screen text-cream">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-14 pb-24">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.05]">
              Shopping Cart
            </h1>
            <p className="mt-2 text-[15px] text-mist tabular-nums">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
          <Link to="/shop" className="link-gold">
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-8 lg:gap-10 items-start">
          {/* Line items: one panel, rows divided by gold rules */}
          <ul className="panel divide-y divide-gold-400/15">
            {cartItems.map((item) => {
              const price = item.product?.price || 0;
              const name = item.product?.name || "Product";
              return (
                <li
                  key={`${item.id}-${item.product_id}`}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] gap-x-4 sm:gap-x-6 gap-y-4 p-4 sm:p-6"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-emerald-800">
                    <img
                      src={
                        typeof item.product?.image_url === "string" &&
                        /^https?:\/\//i.test(item.product.image_url)
                          ? item.product.image_url
                          : placeholderImg
                      }
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 self-center">
                    <h2 className="font-display text-lg sm:text-2xl leading-tight text-cream">
                      {name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                      {item.product?.weight ? (
                        <span className="rounded-lg border border-gold-400/50 px-2.5 py-0.5 font-semibold text-gold-200 tabular-nums">
                          {item.product.weight}g pack
                        </span>
                      ) : null}
                      <span className="text-mist tabular-nums">{rupees(price)} each</span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-end gap-3 sm:gap-6 self-center border-t border-gold-400/10 pt-4 sm:border-0 sm:pt-0">
                    <div className="flex items-center rounded-full border border-gold-400/30">
                      <button
                        onClick={() => changeQty(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${name}`}
                        className="grid h-10 w-10 place-items-center rounded-full text-gold-300 transition-colors hover:bg-gold-400/10"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-7 text-center text-[15px] font-semibold text-cream tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => changeQty(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity of ${name}`}
                        className="grid h-10 w-10 place-items-center rounded-full text-gold-300 transition-colors hover:bg-gold-400/10"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="ml-auto sm:ml-0 min-w-[5.5rem] text-right">
                      <div className="font-display text-2xl text-gold-300 tabular-nums">
                        {rupees(price * item.quantity)}
                      </div>
                      <div className="text-xs text-mist tabular-nums">
                        {rupees(price)} × {item.quantity}
                      </div>
                    </div>

                    <button
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${name} from cart`}
                      title="Remove item"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-mist transition-colors hover:bg-[#F0A08C]/10 hover:text-[#F0A08C]"
                    >
                      <Trash2 size={18} strokeWidth={1.7} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Order summary */}
          <aside className="panel p-6 sm:p-7 lg:sticky lg:top-32">
            <h2 className="font-display text-2xl text-cream">Order Summary</h2>

            <dl className="mt-6 space-y-4">
              <div className="flex justify-between text-[15px]">
                <dt className="text-mist">Items ({totalItems})</dt>
                <dd className="font-semibold text-cream tabular-nums">{rupees(totalPrice)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-gold-400/25 pt-4">
                <dt className="font-semibold text-cream">Total</dt>
                <dd className="font-display text-3xl text-gold-300 tabular-nums">
                  {rupees(totalPrice)}
                </dd>
              </div>
            </dl>

            <ul className="mt-6 space-y-2 text-sm text-mist">
              <li className="flex items-center gap-2">
                <ShieldCheck size={15} strokeWidth={1.7} className="text-gold-400" />
                Secure checkout
              </li>
            </ul>

            <button
              onClick={() => setShowCheckoutModal(true)}
              className="btn-gold group mt-7 w-full !py-4 !text-base"
            >
              Go to Checkout · <span className="tabular-nums">{rupees(totalPrice)}</span>
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-1"
              />
            </button>
            <Link to="/shop" className="btn-outline-gold mt-3 w-full !py-3.5">
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
      />
    </div>
  );
};

export default Cart;
