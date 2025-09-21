import { useState, useEffect } from "react";
import {
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
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
  const { user } = useAuth();
  const { showError, showWarning, showInfo } = useNotification();

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
      const shouldSignIn = confirm(
        "Please sign in to add items to your cart. Would you like to sign in now?"
      );
      if (shouldSignIn) {
        // Trigger Google sign-in
        window.location.href = "/";
      }
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
      <div className="bg-[#FDFBF8] pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A5C3D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
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
      <div className="bg-[#FDFBF8] pt-16 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="text-red-500 mr-3" size={24} />
              <h2 className="text-xl font-bold text-red-800">
                Database Setup Required
              </h2>
            </div>
            <div className="text-red-700 whitespace-pre-line">
              {getDatabaseSetupInstructions(databaseStatus)}
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <a
                href="https://supabase.com/dashboard/project/yclgaxigalixrimuixgo/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                🚀 Setup Database Now
              </a>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  console.log("Verifying database setup...");
                  (window as any).verifyDatabaseSetup?.();
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
    <div className="bg-[#FDFBF8] pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#4A5C3D] mb-3 sm:mb-4">
            Devanagari Health Mix
          </h1>
          <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto px-4">
            A premium blend of 21 natural grains, millets, and pulses, carefully
            crafted to provide complete nutrition. Rich in protein, fiber,
            vitamins, and minerals for your daily wellness journey.
          </p>
        </div>

        {/* Free Delivery Banner */}
        <div className="bg-gradient-to-r from-[#4A5C3D] to-[#3a4a2f] rounded-xl p-4 mb-8 text-center text-white shadow-lg">
          <div className="flex items-center justify-center space-x-2">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <span>🚚</span>
              <span>Free Delivery in Davangere!</span>
            </h3>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
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
            <div className="col-span-full text-center py-12">
              <div className="text-gray-500 text-lg mb-4">
                No products available at the moment.
              </div>
              <p className="text-gray-400">
                Products will appear here once they are added through the admin
                panel.
              </p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-center">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle
                className="text-green-500"
                size={20}
                className="sm:w-6 sm:h-6"
              />
              <span className="text-sm sm:text-base text-gray-700">
                Free shipping on orders over ₹500
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle
                className="text-green-500"
                size={20}
                className="sm:w-6 sm:h-6"
              />
              <span className="text-sm sm:text-base text-gray-700">
                30-day money-back guarantee
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2 sm:col-span-2 lg:col-span-1">
              <CheckCircle
                className="text-green-500"
                size={20}
                className="sm:w-6 sm:h-6"
              />
              <span className="text-sm sm:text-base text-gray-700">
                Made from 100% natural ingredients
              </span>
            </div>
          </div>
        </div>
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

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Product Image */}
      <div className="aspect-square overflow-hidden">
        <img
          src={product.image_url || "/src/assets/shop/First page Flipkart.png"}
          alt={`${product.name} ${product.weight}g`}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Product Info */}
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg sm:text-xl font-bold text-[#4A5C3D] pr-2">
            {product.name}
          </h3>
          {isBestValue && (
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
              Best Value
            </span>
          )}
        </div>

        <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="text-xl sm:text-2xl font-bold text-[#A88B67]">
            ₹{product.price.toFixed(2)}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">
            {product.weight}g pack
          </div>
        </div>

        {/* Stock indicator */}
        {product.stock > 0 && (
          <div className="text-xs sm:text-sm text-green-600 mb-2">
            {product.stock} in stock
          </div>
        )}

        {/* Quantity Selector */}
        <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
          <button
            onClick={decrementQuantity}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#4A5C3D] flex items-center justify-center text-[#4A5C3D] hover:bg-[#4A5C3D] hover:text-white transition-colors"
          >
            <Minus size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
          <span className="text-base sm:text-lg font-semibold text-[#4A5C3D] w-6 sm:w-8 text-center">
            {quantity}
          </span>
          <button
            onClick={incrementQuantity}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#4A5C3D] flex items-center justify-center text-[#4A5C3D] hover:bg-[#4A5C3D] hover:text-white transition-colors"
          >
            <Plus size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={() => onAddToCart(product, quantity)}
          disabled={isAdding || product.stock === 0}
          className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-1.5 sm:space-x-2 text-sm sm:text-base ${
            showSuccess
              ? "bg-green-500 text-white"
              : isAdding || product.stock === 0
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-[#4A5C3D] text-white hover:bg-[#3a4a2f] hover:scale-[1.02]"
          }`}
        >
          {showSuccess ? (
            <>
              <CheckCircle size={16} className="sm:w-5 sm:h-5" />
              <span>Added to Cart!</span>
            </>
          ) : isAdding ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
              <span>Adding...</span>
            </>
          ) : product.stock === 0 ? (
            <>
              <span>Out of Stock</span>
            </>
          ) : (
            <>
              <ShoppingCart size={16} className="sm:w-5 sm:h-5" />
              <span className="truncate">
                Add to Cart - ₹{(product.price * quantity).toFixed(2)}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Shop;
