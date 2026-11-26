import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  RotateCcw,
  Settings,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import { supabase } from "../lib/supabaseClient";

interface AdminLayoutProps {
  children: React.ReactNode;
}

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toShip, setToShip] = useState(0);
  const { logout } = useAuth();
  const { adminUser, isSuperAdmin } = useAdmin();
  const location = useLocation();

  // Browser surfaces (scrollbar, selection, focus) follow the admin palette.
  useEffect(() => {
    document.documentElement.classList.add("admin-mode");
    return () => document.documentElement.classList.remove("admin-mode");
  }, []);

  // Orders waiting to be shipped, shown as a badge on Orders.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"])
      .then(({ count }) => {
        if (!cancelled) setToShip(count || 0);
      });
    setDrawerOpen(false);
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const navigation: NavItem[] = [
    { name: "Shelf", href: "/admin", icon: LayoutGrid },
    { name: "Orders", href: "/admin/orders", icon: ReceiptText, badge: toShip },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Earnings", href: "/admin/analytics", icon: BarChart3 },
    { name: "Promo codes", href: "/admin/promo-codes", icon: Tag },
    { name: "Refunds", href: "/admin/refunds", icon: RotateCcw },
    { name: "Customers", href: "/admin/users", icon: Users },
    ...(isSuperAdmin ? [{ name: "Settings", href: "/admin/settings", icon: Settings }] : []),
  ];

  const rail = (
    <div className="flex h-full flex-col bg-adm-forest px-4 pb-5 pt-6 text-adm-on-forest">
      <Link to="/admin" className="px-2.5 pb-6 font-display text-[22px] font-normal leading-tight text-adm-paper">
        Devanagari <em className="font-normal text-adm-gold">Admin</em>
      </Link>
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {navigation.map((item) => {
          const active = isActive(location.pathname, item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                active ? "bg-adm-paper text-adm-forest" : "text-adm-on-forest hover:bg-white/10"
              }`}
            >
              <item.icon size={17} strokeWidth={1.8} />
              <span className="flex-1">{item.name}</span>
              {item.badge ? (
                <span className="adm-num rounded-full bg-adm-gold px-2 text-xs font-bold leading-5 text-adm-ink">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/15 pt-4 text-sm">
        <div className="px-3 pb-2">
          <div className="truncate font-semibold text-adm-paper">{adminUser?.name || adminUser?.email || "Admin"}</div>
          <div className="text-[13px] text-adm-on-forest">{isSuperAdmin ? "Super admin" : "Admin"}</div>
        </div>
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 font-semibold hover:bg-white/10">
          <ArrowUpRight size={17} strokeWidth={1.8} />
          View shop
        </Link>
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-semibold hover:bg-white/10"
        >
          <LogOut size={17} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-adm-paper text-adm-ink">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-[232px] lg:block">{rail}</aside>

      {/* Phone / tablet: top bar and drawer */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-adm-forest px-4 lg:hidden">
        <Link to="/admin" className="font-display text-lg font-normal text-adm-paper">
          Devanagari <em className="font-normal text-adm-gold">Admin</em>
        </Link>
        <button
          onClick={() => setDrawerOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg text-adm-paper hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </header>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-adm-ink/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px]">
            {rail}
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 grid h-9 w-9 place-items-center rounded-lg text-adm-paper hover:bg-white/10"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <main className="lg:pl-[232px]">
        <div className="mx-auto max-w-[1240px] px-4 py-7 sm:px-8 lg:px-9">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
