import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import OrderDetails from "./pages/OrderDetails";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import PromoCodes from "./pages/admin/PromoCodes";
import Refunds from "./pages/admin/Refunds";
import Users from "./pages/admin/Users";
import Analytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import AuthCallback from "./pages/AuthCallback";

// ✅ Import context providers
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { AdminProvider } from "./context/AdminContext";
import { NotificationProvider } from "./context/NotificationContext";
import "./utils/debugAdmin"; // Load debug functions
import "./utils/testSupabase"; // Load Supabase test
import "./utils/testAdminPanel"; // Load admin panel test
import "./utils/checkSupabaseStatus"; // Load Supabase status check
import "./utils/restoreDatabase"; // Load database restore guide
import "./utils/supabaseRestApi"; // Load REST API functions

function App() {
  // Load Razorpay script when app starts
  useEffect(() => {
    const loadRazorpay = () => {
      if (
        !document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        )
      ) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => {
          console.log("✅ Razorpay SDK loaded successfully");
        };
        script.onerror = () => {
          console.error("❌ Failed to load Razorpay SDK");
        };
        document.head.appendChild(script);
      }
    };

    loadRazorpay();
  }, []);

  return (
    <Router>
      {/* ✅ Wrap everything inside Auth + Cart + Admin + Notification providers */}
      <AuthProvider>
        <CartProvider>
          <AdminProvider>
            <NotificationProvider>
              <div className="min-h-screen flex flex-col font-['Inter']">
                <Routes>
                  {/* Public Routes */}
                  <Route
                    path="/"
                    element={
                      <>
                        <Navbar />
                        <main className="flex-1">
                          <Home />
                        </main>
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/shop"
                    element={
                      <>
                        <Navbar />
                        <main className="flex-1">
                          <Shop />
                        </main>
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/cart"
                    element={
                      <>
                        <Navbar />
                        <main className="flex-1">
                          <Cart />
                        </main>
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <>
                        <Navbar />
                        <main className="flex-1">
                          <Checkout />
                        </main>
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/about"
                    element={
                      <>
                        <Navbar />
                        <main className="flex-1">
                          <About />
                        </main>
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/contact"
                    element={
                      <>
                        <Navbar />
                        <main className="flex-1">
                          <Contact />
                        </main>
                        <Footer />
                      </>
                    }
                  />
                  <Route
                    path="/terms"
                    element={
                      <>
                        <Navbar />
                        <main className="flex-1">
                          <Terms />
                        </main>
                        <Footer />
                      </>
                    }
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Navbar />
                        <main className="flex-1">
                          <Profile />
                        </main>
                        <Footer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Navbar />
                        <main className="flex-1">
                          <Settings />
                        </main>
                        <Footer />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/order/:orderId"
                    element={
                      <ProtectedRoute>
                        <Navbar />
                        <main className="flex-1">
                          <OrderDetails />
                        </main>
                        <Footer />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <Dashboard />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/products"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <Products />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <Orders />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/promo-codes"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <PromoCodes />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/refunds"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <Refunds />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <Users />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <Analytics />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <AdminRoute>
                        <AdminLayout>
                          <AdminSettings />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />

                  {/* Auth Callback Route */}
                  <Route path="/auth/callback" element={<AuthCallback />} />
                </Routes>
              </div>
            </NotificationProvider>
          </AdminProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
