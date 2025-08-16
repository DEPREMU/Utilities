import {
  log,
  logError,
  supabase,
  loadDataSecure,
  signInWithEmail,
  signUpWithEmail,
  getCurrentSession,
  signOut as authSignOut,
  refreshSession as authRefreshSession,
} from "@utils";
import { navigateReplace } from "@navigation/navigationRef";
import { SessionStored, UserData } from "@types";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import React, { createContext, useState, useCallback, useEffect } from "react";

interface UserContextType {
  user: User | null;
  session: SessionStored | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: <T = null>(
    email: string,
    password: string,
    rememberMe?: boolean,
    callback?: (success: boolean, error?: string) => T,
  ) => Promise<T>;
  signUp: <T = void>(
    email: string,
    password: string,
    callback?: (success: boolean, error?: string) => T,
  ) => Promise<T>;
  logout: (callback?: (success: boolean) => void) => Promise<void>;
  refreshToken: () => Promise<void>;
  userData: UserData | null;
}

interface UserProviderProps {
  children: React.ReactNode;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionStored | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  /**
   * Login function using Supabase auth
   */
  const login = useCallback(
    async <T = null,>(
      email: string,
      password: string,
      rememberMe: boolean = false,
      callback?: (success: boolean, error?: string) => void,
    ): Promise<T> => {
      try {
        setLoading(true);
        const {
          user: authUser,
          userData,
          session: authSession,
          error,
        } = await signInWithEmail(email, password, rememberMe);

        if (error) {
          callback?.(false, error);
          return null as T;
        }

        if (authUser && authSession) {
          setUser(authUser);
          setUserData(userData ? userData : null);
          setSession(authSession);
          setIsLoggedIn(true);
          log("User logged in successfully:", authUser.email);
          callback?.(true);
        } else {
          const errorMsg = "No user or session data received";
          callback?.(false, errorMsg);
        }
      } catch (error) {
        const errorMsg = `Login error: ${error}`;
        logError(errorMsg);
        callback?.(false, errorMsg);
      } finally {
        setLoading(false);
      }
      return null as T;
    },
    [],
  );

  /**
   * Sign up function using Supabase auth
   */
  const signUp = useCallback(
    async <T = null,>(
      email: string,
      password: string,
      callback: (success: boolean, error?: string) => T = () => null as T,
    ) => {
      try {
        setLoading(true);
        const { user: authUser, error } = await signUpWithEmail(
          email,
          password,
        );

        if (error) return callback?.(false, error);

        log("User signed up successfully:", authUser?.email || "Unknown");
        callback?.(true);
      } catch (error) {
        const errorMsg = `Sign up error: ${error}`;
        logError(errorMsg);
        return callback?.(false, errorMsg);
      } finally {
        setLoading(false);
      }
      return callback?.(true);
    },
    [],
  );

  /**
   * Logout function
   */
  const logout = useCallback(async (callback?: (success: boolean) => void) => {
    try {
      setLoading(true);
      const { error } = await authSignOut();

      if (error) {
        logError("Logout error:", error);
        callback?.(false);
        return;
      }

      setUser(null);
      setSession(null);
      setUserData(null);
      setIsLoggedIn(false);
      log("User logged out successfully");
      callback?.(true);
    } catch (error) {
      logError("Unexpected logout error:", error);
      callback?.(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh current session
   */
  const refreshToken = useCallback(async () => {
    if (!session?.refresh_token) return;

    try {
      const {
        user: authUser,
        session: authSession,
        error,
      } = await authRefreshSession(session.refresh_token);

      if (error) {
        logError("Token refresh error:", error);
        return;
      }

      if (authUser && authSession) {
        setUser(authUser);
        setSession(authSession);
        log("Token refreshed successfully");
      }
    } catch (error) {
      logError("Unexpected refresh error:", error);
    }
  }, [session?.refresh_token]);

  /**
   * Initialize user session on app start
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const rememberMe = await loadDataSecure<number>("_sessionExpiry");
        if (!rememberMe || rememberMe < Date.now()) return await authSignOut();
        const {
          session: currentSession,
          userData,
          user,
        } = await getCurrentSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(user ?? null);
          setUserData(userData ?? null);
          setIsLoggedIn(true);
          log("Restored user session:", user?.email);
        }
      } catch (error) {
        logError("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Listen to auth state changes
   */
  useEffect(() => {
    const handleonAuthStateChange = async (
      event: AuthChangeEvent,
      session: Session | null,
    ) => {
      log("Auth state changed:", event);

      if (event === "SIGNED_IN" && session) {
        setUser(session.user);
        setSession(session);
        setIsLoggedIn(true);
        log("User signed in via state change:", session.user.email);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
        setIsLoggedIn(false);
        navigateReplace("Login");
        log("User signed out via state change");
      } else if (event === "TOKEN_REFRESHED" && session) {
        setUser(session.user);
        setSession(session);
        log("Token refreshed via state change");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleonAuthStateChange);

    return () => subscription.unsubscribe();
  }, []);

  const contextValue: UserContextType = {
    user,
    session,
    loading,
    userData,
    isLoggedIn,
    login,
    signUp,
    logout,
    refreshToken,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};

/**
 * Hook to use the UserContext
 */
export const useUserContext = (): UserContextType => {
  const context = React.useContext(UserContext);

  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }

  return context;
};
