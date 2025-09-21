import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { userService } from "../services/supabase";
import type { User, AuthError } from "@supabase/supabase-js";

type AuthUser = {
  id: string;
  email: string | null;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    phone?: string;
    phone_number?: string;
    name?: string;
    [key: string]: unknown; // Allow additional metadata fields
  };
};

type AuthResponse = {
  error: AuthError | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  loginWithGoogle: () => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: AuthUser) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const AUTH_USER_KEY = "authUser";

  const readCachedUser = (): AuthUser | null => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && typeof parsed.id === "string") {
        return {
          id: parsed.id,
          email: parsed.email ?? null,
          user_metadata: parsed.user_metadata || {},
        } as AuthUser;
      }
      return null;
    } catch (error) {
      console.warn("Error reading cached user:", error);
      return null;
    }
  };

  const cached = readCachedUser();
  const [user, setUser] = useState<AuthUser | null>(cached);
  const [loading, setLoading] = useState<boolean>(!cached);

  const cacheUser = (authUser: AuthUser): void => {
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
    } catch (error) {
      console.warn("Error caching user:", error);
    }
  };

  const clearCachedUser = (): void => {
    try {
      localStorage.removeItem(AUTH_USER_KEY);
    } catch (error) {
      console.warn("Error clearing cached user:", error);
    }
  };

  const ensureUserInDatabase = async (supabaseUser: User): Promise<void> => {
    try {
      await userService.ensureUserExists({
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name:
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          null,
        avatar_url: supabaseUser.user_metadata?.avatar_url || null,
      });
    } catch (error) {
      console.error("❌ Error ensuring user exists in database:", error);
      console.log(
        "⚠️ User creation failed, but auth flow continues. User will be created when needed."
      );
    }
  };

  const loadUserFromDatabase = async (
    userId: string
  ): Promise<AuthUser | null> => {
    try {
      const dbUser = await userService.getUser(userId);
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          user_metadata: {
            full_name: dbUser.full_name,
            avatar_url: dbUser.avatar_url,
            phone: dbUser.phone,
            phone_number: dbUser.phone,
            name: dbUser.full_name,
          },
        };
      }
      return null;
    } catch (error) {
      console.error("❌ Error loading user from database:", error);
      return null;
    }
  };

  const createAuthUser = (supabaseUser: User): AuthUser => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || null,
      user_metadata: {
        full_name: supabaseUser.user_metadata?.full_name,
        avatar_url: supabaseUser.user_metadata?.avatar_url,
        phone: supabaseUser.user_metadata?.phone,
        phone_number: supabaseUser.user_metadata?.phone_number,
        name: supabaseUser.user_metadata?.name,
        ...supabaseUser.user_metadata,
      },
    };
  };

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const getInitialSession = async (): Promise<void> => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("Error getting initial session:", error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const authUser = createAuthUser(session.user);
          setUser(authUser);
          cacheUser(authUser);

          // Ensure user exists in database (non-blocking)
          ensureUserInDatabase(session.user).catch(console.error);
        }
      } catch (error) {
        console.error("Error in getInitialSession:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "[AuthContext] Auth state changed:",
        event,
        session?.user?.email,
        "Session exists:",
        !!session
      );

      if (!isMounted) return;

      try {
        if (event === "SIGNED_IN" && session?.user) {
          const authUser = createAuthUser(session.user);
          setUser(authUser);
          cacheUser(authUser);

          // Ensure user exists in database (non-blocking)
          ensureUserInDatabase(session.user).catch(console.error);
        } else if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          clearCachedUser();
        } else if (session?.user) {
          const authUser = createAuthUser(session.user);
          setUser(authUser);
          cacheUser(authUser);
        }
      } catch (error) {
        console.error("Error in auth state change handler:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error("Signup error:", error);
      return { error: error as AuthError };
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error("Login error:", error);
      return { error: error as AuthError };
    }
  };

  const loginWithGoogle = async (): Promise<AuthResponse> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      return { error };
    } catch (error) {
      console.error("Google login error:", error);
      return { error: error as AuthError };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = (updatedUser: AuthUser): void => {
    setUser(updatedUser);
    cacheUser(updatedUser);
  };

  const refreshUser = async (): Promise<void> => {
    if (!user) return;

    try {
      const dbUser = await loadUserFromDatabase(user.id);
      if (dbUser) {
        setUser(dbUser);
        cacheUser(dbUser);
      }
    } catch (error) {
      console.error("❌ Error refreshing user data:", error);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signup,
      login,
      loginWithGoogle,
      logout,
      updateUser,
      refreshUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
