import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";
import logo from "../assets/logo.png";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = useState(false);
  const userMenuCloseTimer = useRef<number | null>(null);
  const location = useLocation();
  const { user, loading, loginWithGoogle, logout } = useAuth();
  const { totalItems } = useCart();
  const {
    isAdmin,
    isSuperAdmin,
    adminUser,
    loading: adminLoading,
  } = useAdmin();

  // Debug admin status
  useEffect(() => {
    console.log("🔍 Navbar admin status:", {
      isAdmin,
      isSuperAdmin,
      adminUser,
      adminLoading,
      user: user?.email,
    });
  }, [isAdmin, isSuperAdmin, adminUser, adminLoading, user]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileUserMenuOpen) {
        const target = event.target as Element;
        if (!target.closest(".mobile-user-menu")) {
          setIsMobileUserMenuOpen(false);
        }
      }
    };

    if (isMobileUserMenuOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 200);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isMobileUserMenuOpen]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  const userNavLinks = [
    { name: "My Profile", path: "/profile" },
    { name: "Orders", path: "/profile?tab=orders" },
  ];

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-sm shadow-lg" : "bg-white"
      }`}
    >
      {/* Mobile Layout */}
      <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile Logo/Back Button - Show logo on home page, back button on other pages */}
          {location.pathname === "/" ? (
            <Link to="/" className="flex items-center space-x-2">
              <img src={logo} alt="Company Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold text-[#4A5C3D]">
                Devanagari
              </span>
            </Link>
          ) : (
            <Link
              to="/"
              className="flex items-center space-x-2 text-[#4A5C3D] hover:text-[#3a4a2f] transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-lg font-semibold">Home</span>
            </Link>
          )}

          {/* Mobile Right Side Icons */}
          <div className="flex items-center space-x-2">
            <Link
              to="/cart"
              className="relative p-2 text-gray-700 hover:text-[#4A5C3D] transition-colors duration-200"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#4A5C3D] text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-700"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Full Width Grid */}
      <div className="hidden md:grid grid-cols-3 items-center h-16 w-full">
        {/* Left Column - Logo */}
        <div className="flex justify-start px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="Company Logo" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-[#4A5C3D]">
              Devanagari
            </span>
          </Link>
        </div>

        {/* Center Column - Navigation Links */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors duration-200 ${
                  location.pathname === link.path
                    ? "text-[#4A5C3D] border-b-2 border-[#4A5C3D] pb-1"
                    : "text-gray-700 hover:text-[#4A5C3D]"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column - Cart and User Menu */}
        <div className="flex justify-end px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/cart"
              className="relative p-2 text-gray-700 hover:text-[#4A5C3D] transition-colors duration-200"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#4A5C3D] text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {loading && (
              <div className="h-8 w-28 rounded-md bg-gray-200 animate-pulse" />
            )}

            {!loading && !user && (
              <button
                onClick={loginWithGoogle}
                className="px-3 py-2 rounded-md bg-[#4A5C3D] text-white text-sm hover:opacity-90"
              >
                Sign in with Google
              </button>
            )}

            {!loading && user && (
              <div
                className="relative"
                onMouseEnter={() => {
                  if (userMenuCloseTimer.current) {
                    clearTimeout(userMenuCloseTimer.current);
                    userMenuCloseTimer.current = null;
                  }
                  setIsUserMenuOpen(true);
                }}
                onMouseLeave={() => {
                  if (userMenuCloseTimer.current) {
                    clearTimeout(userMenuCloseTimer.current);
                  }
                  userMenuCloseTimer.current = window.setTimeout(() => {
                    setIsUserMenuOpen(false);
                  }, 150);
                }}
              >
                <button className="flex items-center space-x-2 group">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata.full_name || "User avatar"}
                      className="h-8 w-8 rounded-full border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove(
                          "hidden"
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ${
                      user.user_metadata?.avatar_url ? "hidden" : ""
                    }`}
                  >
                    <span className="text-sm font-bold text-gray-600">
                      {(user.user_metadata?.full_name || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-[#4A5C3D]">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
                    onMouseEnter={() => {
                      if (userMenuCloseTimer.current) {
                        clearTimeout(userMenuCloseTimer.current);
                        userMenuCloseTimer.current = null;
                      }
                      setIsUserMenuOpen(true);
                    }}
                    onMouseLeave={() => {
                      if (userMenuCloseTimer.current) {
                        clearTimeout(userMenuCloseTimer.current);
                      }
                      userMenuCloseTimer.current = window.setTimeout(() => {
                        setIsUserMenuOpen(false);
                      }, 150);
                    }}
                  >
                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/profile?tab=orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Orders
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-200">
          <div className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm font-medium ${
                  location.pathname === link.path
                    ? "text-[#4A5C3D] font-semibold"
                    : "text-gray-700"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-4 border-t border-gray-200">
              {/* Loading State */}
              {loading && (
                <div className="flex justify-center">
                  <div className="h-8 w-28 rounded-md bg-gray-200 animate-pulse" />
                </div>
              )}

              {/* Sign In Button */}
              {!loading && !user && (
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      loginWithGoogle();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 rounded-md bg-[#4A5C3D] text-white text-sm"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}

              {/* User Profile Section */}
              {!loading && user && (
                <div className="relative mobile-user-menu w-full">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newState = !isMobileUserMenuOpen;
                      setIsMobileUserMenuOpen(newState);
                    }}
                    className="flex items-center space-x-3 w-full p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt={user.user_metadata.full_name || "User avatar"}
                        className="h-8 w-8 rounded-full border border-gray-200"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden"
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ${
                        user.user_metadata?.avatar_url ? "hidden" : ""
                      }`}
                    >
                      <span className="text-sm font-bold text-gray-600">
                        {(user.user_metadata?.full_name || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700 flex-1 text-left">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform duration-200 ${
                        isMobileUserMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Mobile Profile Dropdown */}
                  {isMobileUserMenuOpen && (
                    <div className="relative mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[60]">
                      <Link
                        to="/profile"
                        onClick={() => {
                          setIsMobileUserMenuOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Profile
                      </Link>
                      <Link
                        to="/profile?tab=orders"
                        onClick={() => {
                          setIsMobileUserMenuOpen(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Orders
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => {
                            setIsMobileUserMenuOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                          className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsMobileUserMenuOpen(false);
                          setIsMobileMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
