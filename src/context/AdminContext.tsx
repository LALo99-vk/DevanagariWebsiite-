import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";

// Updated AdminContext - removed useAuth dependency to fix circular provider issues

// Types
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "super_admin";
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AdminContextValue {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminUser: AdminUser | null;
  adminActions: AdminAction[];
  loading: boolean;
  error: string | null;
  checkAdminStatus: () => Promise<void>;
  logAdminAction: (
    action: Omit<AdminAction, "id" | "admin_id" | "created_at">
  ) => Promise<void>;
  refreshAdminActions: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  // Fixed: Removed useAuth dependency to prevent circular provider issues
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Get current user from Supabase auth
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error getting current user:", error);
        setUser(null);
      }
    };

    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async () => {
    if (!user) {
      console.log("🔍 AdminContext: No user, setting admin to false");
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminUser(null);
      setLoading(false);
      return;
    }

    try {
      console.log(
        "🔍 AdminContext: Starting admin status check for user:",
        user.id
      );
      setLoading(true);
      setError(null);

      // Check admin status from database
      console.log("🔍 AdminContext: Checking admin status from database");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("is_admin, role")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching user admin status:", userError);
        // Fallback: Check if user email matches admin email
        const isAdminUser = user.email === "adityapiyush71@gmail.com";
        const isSuperAdminUser = user.email === "adityapiyush71@gmail.com";

        console.log("🔍 Admin status check (fallback):", {
          email: user.email,
          isAdminUser,
          isSuperAdminUser,
        });

        setIsAdmin(isAdminUser);
        setIsSuperAdmin(isSuperAdminUser);

        if (isAdminUser) {
          setAdminUser({
            id: user.id,
            email: user.email || "",
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "Admin",
            role: "super_admin",
            is_active: true,
            last_login: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        } else {
          setAdminUser(null);
        }
        return;
      }

      const isAdminUser = userData?.is_admin || false;
      const isSuperAdminUser = userData?.role === "super_admin";

      console.log("🔍 Admin status check (database):", {
        email: user.email,
        isAdminUser,
        isSuperAdminUser,
        userData,
      });

      setIsAdmin(isAdminUser);
      setIsSuperAdmin(isSuperAdminUser);

      if (isAdminUser) {
        setAdminUser({
          id: user.id,
          email: user.email || "",
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "Admin",
          role: userData?.role || "admin",
          is_active: true,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } else {
        setAdminUser(null);
      }
    } catch (err) {
      console.error("Error in checkAdminStatus:", err);
      setError("An unexpected error occurred");
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (
    action: Omit<AdminAction, "id" | "admin_id" | "created_at">
  ) => {
    if (!isAdmin || !user) {
      console.warn("Cannot log admin action: user is not an admin");
      return;
    }

    try {
      const { error } = await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action_type: action.action_type,
        resource_type: action.resource_type,
        resource_id: action.resource_id,
        old_values: action.old_values,
        new_values: action.new_values,
        ip_address: action.ip_address,
        user_agent: action.user_agent,
      });

      if (error) {
        console.error("Error logging admin action:", error);
      }
    } catch (err) {
      console.error("Error in logAdminAction:", err);
    }
  };

  const refreshAdminActions = async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from("admin_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching admin actions:", error);
        setError("Failed to fetch admin actions");
      } else {
        setAdminActions(data || []);
      }
    } catch (err) {
      console.error("Error in refreshAdminActions:", err);
      setError("An unexpected error occurred");
    }
  };

  // Check admin status when user changes
  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  // Refresh admin actions when admin status changes
  useEffect(() => {
    if (isAdmin) {
      refreshAdminActions();
    }
  }, [isAdmin]);

  const value: AdminContextValue = {
    isAdmin,
    isSuperAdmin,
    adminUser,
    adminActions,
    loading,
    error,
    checkAdminStatus,
    logAdminAction,
    refreshAdminActions,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextValue => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
