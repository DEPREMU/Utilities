import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  createContext,
} from "react";
import {
  log,
  logError,
  isValidEmail,
  loadDataSecure,
  signInWithEmail,
  signUpWithEmail,
  setIntervalPolyfill,
  clearIntervalPolyfill,
  signOut as authSignOut,
  refreshSession as authRefreshSession,
  forgotPasswordWithEmail as authForgotPassword,
} from "@utils";
import { UserData } from "@types";
import { Platform } from "react-native";
import windowModule from "@/utils/modules/WindowModule";
import { navigateReplace } from "@navigation/navigationRef";

interface UserContextType {
  sessionToken: string | null;
  loggingIn: boolean;
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
  forgotPassword: (
    email: string,
    callback?: (success: boolean, error?: string) => void,
  ) => Promise<void>;
  userData: Omit<UserData, "password"> | null;
}

interface UserProviderProps {
  children: React.ReactNode;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const sessionInitialized = useRef<boolean>(false);

  const [userData, setUserData] = useState<Omit<UserData, "password"> | null>(
    null,
  );
  const [loggingIn, setLoggingIn] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const idRefreshSession = useRef<NodeJS.Timeout | number | null>(null);

  /**
   * Login function using Database auth
   */
  const login = useCallback(
    async <T = null,>(
      email: string,
      password: string,
      rememberMe: boolean = false,
      callback?: (success: boolean, error?: string) => void,
    ): Promise<T> => {
      try {
        setLoggingIn(true);
        const { userData, token, error } = await signInWithEmail(
          email,
          password,
          rememberMe,
        );

        if (error) {
          callback?.(false, error);
          return null as T;
        }

        if (userData && token) {
          setUserData(userData ? userData : null);
          setSessionToken(token);
          setIsLoggedIn(true);
          sessionInitialized.current = true;
          log("User logged in successfully:", userData.email);
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
        setLoggingIn(false);
      }
      return null as T;
    },
    [],
  );

  /**
   * Sign up function using Database auth
   */
  const signUp = useCallback(
    async <T = null,>(
      email: string,
      password: string,
      callback: (success: boolean, error?: string) => T = () => null as T,
    ) => {
      try {
        setLoggingIn(true);
        const { error } = await signUpWithEmail(email, password);

        if (error) return callback?.(false, error);

        log("User signed up successfully:", email);
        callback?.(true);
      } catch (error) {
        const errorMsg = `Sign up error: ${error}`;
        logError(errorMsg);
        return callback?.(false, errorMsg);
      } finally {
        setLoggingIn(false);
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
      setLoggingIn(true);
      const { error } = await authSignOut();

      if (error) {
        logError("Logout error:", error);
        callback?.(false);
        return;
      }

      setSessionToken(null);
      setUserData(null);
      setIsLoggedIn(false);
      navigateReplace("Login");
      log("User logged out successfully");
      callback?.(true);
    } catch (error) {
      logError("Unexpected logout error:", error);
      callback?.(false);
    } finally {
      setLoggingIn(false);
    }
  }, []);

  /**
   * Forgot password function
   */
  const forgotPassword = useCallback(
    async (
      email: string,
      callback?: (success: boolean, error?: string) => void,
    ) => {
      if (!isValidEmail(email)) {
        callback?.(false, "Invalid email format");
        return;
      }

      try {
        setLoggingIn(true);
        const { success, error } = await authForgotPassword(email);

        if (!success || error) {
          logError("Forgot password error:", error);
          callback?.(false, error);
          return;
        }

        callback?.(true);
      } catch (error) {
        logError("Unexpected forgot password error:", error);
        callback?.(false, error as string);
      } finally {
        setLoggingIn(false);
      }
    },
    [],
  );

  /**
   * Refresh current session
   */
  const refreshToken = useCallback(async () => {
    if (!sessionToken || sessionInitialized.current) return;

    try {
      const { userData, token, error } = await authRefreshSession(sessionToken);

      if (error) {
        logError("Token refresh error:", error);
        return;
      }

      if (userData && token) {
        setUserData(userData);
        setSessionToken(token);
        sessionInitialized.current = true;
        log("Token refreshed successfully");
      }
    } catch (error) {
      logError("Unexpected refresh error:", error);
    }
  }, [sessionToken]);

  /**
   * Initialize user session on app start
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const sendNotificationLoginStatus = (isLoggedIn: boolean) => {
        if (Platform.OS !== "web") return;

        windowModule?.notifyLoginStatus?.(isLoggedIn);
      };

      try {
        const rememberMe = await loadDataSecure("_sessionExpiry");
        if (!rememberMe || rememberMe < Date.now()) {
          sendNotificationLoginStatus(false);
          await authSignOut();
          return;
        }
        const sessionToken = await loadDataSecure("_userSessionTokenStorage");

        if (!sessionToken) {
          sendNotificationLoginStatus(false);
          return;
        }

        const { userData, token } = await authRefreshSession(sessionToken);

        if (token && userData) {
          const handleRefreshToken = () => {
            sessionInitialized.current = false;
            refreshToken();
            if (!idRefreshSession.current) return;

            clearIntervalPolyfill(idRefreshSession.current);
            idRefreshSession.current = null;
          };

          setSessionToken(token);
          setUserData(userData);
          setIsLoggedIn(true);
          sendNotificationLoginStatus(true);
          sessionInitialized.current = true;
          log("Restored user session:", userData?.email);
          idRefreshSession.current = setIntervalPolyfill(
            handleRefreshToken,
            24 * 60 * 60 * 1000,
          );
        }
      } catch (error) {
        authSignOut();
        sendNotificationLoginStatus(false);
        logError("Error initializing auth:", error);
      } finally {
        setLoggingIn(false);
      }
    };

    if (!sessionInitialized.current) initializeAuth();

    return () => {
      if (!idRefreshSession.current) return;

      clearIntervalPolyfill(idRefreshSession.current);
      idRefreshSession.current = null;
    };
  }, [refreshToken]);

  const contextValue: UserContextType = {
    login,
    signUp,
    logout,
    userData,
    loggingIn,
    isLoggedIn,
    sessionToken,
    refreshToken,
    forgotPassword,
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
