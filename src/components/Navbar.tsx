import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";
import { LickingLogo } from "./LickingWordmark";

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

  const avatar = (size: string) =>
    user ? (
      <>
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata.full_name || "User avatar"}
            className={`${size} rounded-full border border-gold-400/50 object-cover`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={`${size} rounded-full bg-gold-400/15 border border-gold-400/40 flex items-center justify-center ${
            user.user_metadata?.avatar_url ? "hidden" : ""
          }`}
        >
          <span className="text-sm font-semibold text-gold-200">
            {(user.user_metadata?.full_name || user.email || "U")
              .charAt(0)
              .toUpperCase()}
          </span>
        </div>
      </>
    ) : null;

  const cartButton = (
    <Link
      to="/cart"
      className="relative grid h-10 w-10 place-items-center rounded-full text-cream/85 transition-colors duration-200 hover:bg-gold-400/10 hover:text-gold-200"
      aria-label="Cart"
    >
      <ShoppingCart size={19} strokeWidth={1.6} />
      {totalItems > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-emerald-950 ring-2 ring-emerald-950">
          {totalItems}
        </span>
      )}
    </Link>
  );

  const menuItemClass =
    "block px-4 py-2.5 text-sm text-cream/85 hover:bg-gold-400/10 hover:text-gold-100 transition-colors";

  return (
    <nav className="fixed w-full top-0 z-50">
      <div
        className={`border-b bg-emerald-950 transition-colors duration-300 ${
          isScrolled ? "border-gold-400/25" : "border-gold-400/15"
        }`}
      >
        {/* Mobile Layout */}
        <div className="md:hidden px-4 sm:px-6">
          <div className="flex justify-between items-center h-24">
            {location.pathname === "/" ? (
              <Link to="/" className="flex items-center -mt-1" aria-label="Devanagari home">
                <LickingLogo className="w-[118px]" />
              </Link>
            ) : (
              <Link
                to="/"
                className="flex items-center gap-2 text-gold-200 hover:text-gold-100 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-semibold tracking-wide">Home</span>
              </Link>
            )}

            <div className="flex items-center gap-1">
              {cartButton}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="grid h-10 w-10 place-items-center rounded-full text-cream/85 hover:text-gold-200"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-3 items-center h-24 mx-auto max-w-7xl px-6 lg:px-8">
          {/* Left — navigation */}
          <div className="flex items-center gap-8">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`group relative py-2 text-[15px] font-medium tracking-wide transition-colors duration-200 ${
                    active ? "text-gold-200" : "text-mist hover:text-cream"
                  }`}
                >
                  {link.name}
                  <span
                    className={`absolute -bottom-0.5 left-0 h-px bg-gold-400 transition-all duration-300 ${
                      active ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Center — logo */}
          <div className="flex justify-center">
            <Link to="/" className="flex items-center -mt-1" aria-label="Devanagari home">
              <LickingLogo className="w-[148px]" />
            </Link>
          </div>

          {/* Right — cart & account */}
          <div className="flex justify-end">
            <div className="flex items-center gap-3">
              {cartButton}

              {loading && (
                <div className="h-9 w-36 rounded-full bg-white/10 animate-pulse" />
              )}

              {!loading && !user && (
                <button
                  onClick={loginWithGoogle}
                  className="btn-gold !px-6 !py-2.5 !text-[14px]"
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
                  <button className="flex items-center gap-2 rounded-full border border-gold-400/20 py-1 pl-1 pr-3 transition-colors hover:border-gold-400/50 group">
                    {avatar("h-8 w-8")}
                    <span className="max-w-[140px] truncate text-[13px] text-cream/85 group-hover:text-gold-100">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <ChevronDown size={14} className="text-gold-300/70" />
                  </button>
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 mt-3 w-52 overflow-hidden rounded-xl border border-gold-400/20 bg-emerald-900 py-2 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] z-50"
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
                        className={menuItemClass}
                      >
                        My Profile
                      </Link>
                      <Link
                        to="/profile?tab=orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className={menuItemClass}
                      >
                        Orders
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2.5 text-sm font-medium text-gold-300 hover:bg-gold-400/10"
                        >
                          Admin Panel
                        </Link>
                      )}
                      <div className="my-1 h-px bg-gold-400/10" />
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-400/10"
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
          <div className="md:hidden px-4 sm:px-6 pb-6 pt-2 border-t border-gold-400/10">
            <div className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`font-display py-3 text-2xl border-b border-gold-400/10 ${
                    location.pathname === link.path
                      ? "text-gold-200"
                      : "text-cream/85"
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              <div className="pt-5">
                {loading && (
                  <div className="flex justify-center">
                    <div className="h-10 w-40 rounded-full bg-white/10 animate-pulse" />
                  </div>
                )}

                {!loading && !user && (
                  <button
                    onClick={() => {
                      loginWithGoogle();
                      setIsMobileMenuOpen(false);
                    }}
                    className="btn-gold w-full"
                  >
                    Sign in with Google
                  </button>
                )}

                {!loading && user && (
                  <div className="relative mobile-user-menu w-full">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMobileUserMenuOpen(!isMobileUserMenuOpen);
                      }}
                      className="flex items-center gap-3 w-full rounded-xl border border-gold-400/20 p-2.5 cursor-pointer"
                    >
                      {avatar("h-9 w-9")}
                      <span className="text-sm text-cream flex-1 text-left truncate">
                        {user.user_metadata?.full_name || user.email}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-gold-300 transition-transform duration-200 ${
                          isMobileUserMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isMobileUserMenuOpen && (
                      <div className="relative mt-2 overflow-hidden rounded-xl border border-gold-400/15 bg-emerald-900 py-2 z-[60]">
                        <Link
                          to="/profile"
                          onClick={() => {
                            setIsMobileUserMenuOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                          className={menuItemClass}
                        >
                          My Profile
                        </Link>
                        <Link
                          to="/profile?tab=orders"
                          onClick={() => {
                            setIsMobileUserMenuOpen(false);
                            setIsMobileMenuOpen(false);
                          }}
                          className={menuItemClass}
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
                            className="block px-4 py-2.5 text-sm font-medium text-gold-300 hover:bg-gold-400/10"
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
                          className="w-full text-left px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-400/10"
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
      </div>
    </nav>
  );
};

export default Navbar;
