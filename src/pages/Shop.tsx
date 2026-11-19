import { useState, useEffect } from "react";
import {
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Truck,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../lib/supabaseClient";
import { checkDatabaseSetup } from "../utils/databaseCheck";
import {
  checkDatabaseStatus,
  getDatabaseSetupInstructions,
  DatabaseStatus,
} from "../utils/databaseSetupHelper";
import "../utils/verifyDatabase"; // Import verification utility
import firstPageFlipkart from "../assets/shop/First page Flipkart.png";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  weight: number;
  created_at: string;
}

const Shop = () => {
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(
    null
  );
  const { addItem } = useCart();
  const { user, loginWithGoogle } = useAuth();
  const { showError, showWarning, showNotification } = useNotification();

  useEffect(() => {
    const initializeShop = async () => {
      try {
        // Check database setup (with timeout to prevent hanging)
        const setupPromise = checkDatabaseSetup();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database check timeout")), 10000)
        );

        await Promise.race([setupPromise, timeoutPromise]);

        // Check database status for better error handling
        const status = await checkDatabaseStatus();
        setDatabaseStatus(status);

        // Fetch products from database
        await fetchProducts();

        console.log("Shop initialized with database status:", status);
      } catch (error) {
        console.error("Error initializing shop:", error);
        setDatabaseStatus({
          isConnected: false,
          tablesExist: false,
          missingTables: [],
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeShop();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log("🛍️ Fetching products from database...");
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
        throw error;
      }

      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    if (!user) {
      showNotification({
        type: "info",
        title: "Sign in to add items to your cart",
        message: "Sign in with your Google account to keep your cart and check out.",
        duration: 9000,
        action: {
          label: "Sign in with Google",
          onClick: () => {
            loginWithGoogle().catch(() =>
              showError("Sign-in failed", "Please try again in a moment.")
            );
          },
        },
      });
      return;
    }

    const productKey = `product-${product.id}`;
    setAddingToCart(productKey);

    try {
      console.log("🛒 Shop: Adding to cart:", {
        product,
        quantity,
        userId: user.id,
      });

      // Add the product to cart
      await addItem(product, quantity);

      // Show success feedback
      setShowSuccess(productKey);
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (error) {
      console.error("❌ Shop: Error adding to cart:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Show more specific error messages
      if (errorMessage.includes("Database tables not found")) {
        showError(
          "Database Setup Required",
          `${errorMessage}\n\nPlease follow the setup instructions to create the required database tables.`
        );
      } else if (errorMessage.includes("User must be logged in")) {
        showWarning(
          "Sign In Required",
          "Please sign in to add items to your cart"
        );
      } else {
        showError(
          "Add to Cart Failed",
          `Failed to add item to cart: ${errorMessage}\n\nPlease check the console for more details.`
        );
      }
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-emerald-950 pt-24 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-gold-400/20 border-t-gold-400"></div>
          <p className="text-sm text-mist">Loading products...</p>
        </div>
      </div>
    );
  }

  // Show database setup error if needed
  if (
    databaseStatus &&
    (!databaseStatus.isConnected || !databaseStatus.tablesExist)
  ) {
    return (
      <div className="bg-emerald-950 pt-24 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="panel p-8">
            <div className="flex items-center mb-4">
              <AlertCircle className="text-rose-300 mr-3" size={24} />
              <h2 className="font-display text-2xl text-cream">
                Database Setup Required
              </h2>
            </div>
            <div className="text-mist whitespace-pre-line text-sm leading-relaxed">
              {getDatabaseSetupInstructions(databaseStatus)}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://supabase.com/dashboard/project/yclgaxigalixrimuixgo/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold"
              >
                🚀 Setup Database Now
              </a>
              <button
                onClick={() => window.location.reload()}
                className="btn-outline-gold"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  console.log("Verifying database setup...");
                  (window as any).verifyDatabaseSetup?.();
                }}
                className="btn-outline-gold"
              >
                Verify Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-emerald-950 pt-24 min-h-screen text-cream">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-24">
        {/* Header */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end mb-12 sm:mb-16">
          <h1 className="font-display lg:col-span-6 text-5xl sm:text-6xl leading-[1.04]">
            Devanagari <span className="italic text-gold-400">Health Mix</span>
          </h1>
          <p className="lg:col-span-6 text-[17px] leading-[1.7] text-mist">
            A premium blend of 21 natural grains, millets, and pulses, carefully
            crafted to provide complete nutrition. Rich in protein, fiber,
            vitamins, and minerals for your daily wellness journey.
          </p>
        </div>

        {/* Free Delivery Banner */}
        <div className="mb-10 flex items-center gap-3 border-y border-gold-400/20 py-4">
          <Truck size={20} strokeWidth={1.6} className="text-gold-400" />
          <h3 className="font-display text-xl text-gold-200">
            Free Delivery in Davangere!
          </h3>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {products.length > 0 ? (
            products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                isAdding={addingToCart === `product-${product.id}`}
                showSuccess={showSuccess === `product-${product.id}`}
                isBestValue={index === 0} // First product is best value
              />
            ))
          ) : (
            <div className="col-span-full panel text-center py-16 px-6">
              <div className="font-display text-2xl text-cream mb-3">
                No products available at the moment.
              </div>
              <p className="text-mist">
                Products will appear here once they are added through the admin
                panel.
              </p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gold-400/20 pt-8">
          {[
            "No refunds!",
            "Questions? Reach out to us",
            "Made from 100% natural ingredients",
          ].map((text) => (
            <li key={text} className="flex items-center gap-3">
              <CheckCircle className="text-gold-400 shrink-0" size={18} strokeWidth={1.6} />
              <span className="text-[15px] text-mist">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Product Card Component
interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number) => void;
  isAdding: boolean;
  showSuccess: boolean;
  isBestValue?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  isAdding,
  showSuccess,
  isBestValue = false,
}) => {
  const [quantity, setQuantity] = useState(1);

  const resolveImageSrc = (url?: string): string => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) return url;
    return firstPageFlipkart;
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-gold-400/20 bg-emerald-900 transition-colors duration-200 hover:border-gold-400/45">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-emerald-800">
        <img
          src={resolveImageSrc(product.image_url)}
          alt={`${product.name} ${product.weight}g`}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        {isBestValue && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-3 py-1 text-[12px] font-semibold text-emerald-950">
            Best Value
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-2xl leading-tight text-cream">
            {product.name}
          </h3>
          <span className="shrink-0 text-[13px] text-mist">{product.weight}g pack</span>
        </div>

        <p className="mt-2 text-[15px] leading-[1.6] text-mist line-clamp-2">
          {product.description}
        </p>

        <div className="mt-5 flex items-baseline justify-between">
          <div className="font-display text-3xl text-gold-300 tabular-nums">
            ₹{product.price.toFixed(2)}
          </div>
          {product.stock > 0 && (
            <div className="text-[13px] text-emerald-300">
              {product.stock} in stock
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 flex items-center gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center rounded-full border border-gold-400/30">
            <button
              onClick={decrementQuantity}
              aria-label="Decrease quantity"
              className="grid h-10 w-10 place-items-center rounded-full text-gold-300 transition-colors hover:bg-gold-400/10"
            >
              <Minus size={14} />
            </button>
            <span className="w-7 text-center text-[15px] font-semibold text-cream tabular-nums">
              {quantity}
            </span>
            <button
              onClick={incrementQuantity}
              aria-label="Increase quantity"
              className="grid h-10 w-10 place-items-center rounded-full text-gold-300 transition-colors hover:bg-gold-400/10"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={() => onAddToCart(product, quantity)}
            disabled={isAdding || product.stock === 0}
            className={`flex-1 !px-4 ${
              showSuccess
                ? "inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 text-sm font-semibold text-cream"
                : isAdding || product.stock === 0
                ? "inline-flex items-center justify-center gap-2 rounded-full border border-gold-400/15 py-3 text-sm font-semibold text-mist/70 cursor-not-allowed"
                : "btn-gold"
            }`}
          >
            {showSuccess ? (
              <>
                <CheckCircle size={16} />
                <span>Added to Cart!</span>
              </>
            ) : isAdding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-950/30 border-t-emerald-950"></div>
                <span>Adding...</span>
              </>
            ) : product.stock === 0 ? (
              <>
                <span>Out of Stock</span>
              </>
            ) : (
              <>
                <ShoppingCart size={16} strokeWidth={1.8} />
                <span className="truncate">
                  Add to Cart - ₹{(product.price * quantity).toFixed(2)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Shop;
