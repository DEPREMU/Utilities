/* eslint-disable @stylistic/indent */
import {
  log,
  signOut,
  logError,
  isValidEmail,
  loadDataSecure,
  signInWithEmail,
  signUpWithEmail,
  signOut as authSignOut,
  refreshSession as authRefreshSession,
  forgotPasswordWithEmail as authForgotPassword,
} from "@utils";
import { UserData } from "@types";
import { Platform } from "react-native";
import windowModule from "@/utils/modules/WindowModule";
import { navigateReplace } from "@navigation/navigationRef";
import React, { useState, useCallback, createContext, useEffect } from "react";

interface UserContextType {
  sessionToken: string | null;
  loggingIn: boolean;
  isLoggedIn: boolean;
  loginRef: React.RefObject<
    <T = null>(
      email: string,
      password: string,
      rememberMe?: boolean,
      callback?: (success: boolean, error?: string) => T,
    ) => Promise<T>
  >;
  signUpRef: React.RefObject<
    <T = void>(
      email: string,
      password: string,
      callback?: (success: boolean, error?: string) => T,
    ) => Promise<T>
  >;
  logoutRef: React.RefObject<
    (callback?: (success: boolean) => void) => Promise<void>
  >;
  refreshTokenRef: React.RefObject<() => Promise<boolean>>;
  forgotPasswordRef: React.RefObject<
    (
      email: string,
      callback?: (success: boolean, error?: string) => void,
    ) => Promise<void>
  >;
  userData: Omit<UserData, "password"> | null;
  setLoggingIn: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UserProviderProps {
  children: React.ReactNode;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userData, setUserData] = useState<Omit<UserData, "password"> | null>(
    null,
  );
  const [loggingIn, setLoggingIn] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

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
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const sendNotificationLoginStatus =
      Platform.OS !== "web"
        ? () => {}
        : (isLoggedIn: boolean) =>
            windowModule?.notifyLoginStatus?.(isLoggedIn);
    const handleNotLoggedIn = () => {
      sendNotificationLoginStatus(false);
      setLoggingIn(false);
      setIsLoggedIn(false);
      return false as const;
    };
    const handleLoggedIn = () => {
      setIsLoggedIn(true);
      setLoggingIn(false);
      sendNotificationLoginStatus(true);
      return true as const;
    };

    try {
      const [rememberMe, sessionToken] = await Promise.all([
        loadDataSecure("_sessionExpiry"),
        loadDataSecure("_userSessionTokenStorage"),
      ]);

      if (!rememberMe || !sessionToken) return handleNotLoggedIn();

      if (rememberMe < Date.now()) {
        await signOut();
        return handleNotLoggedIn();
      }

      setLoggingIn(true);

      const { userData, token, error } = await authRefreshSession(sessionToken);

      if (error) return handleNotLoggedIn();

      if (!userData || !token) {
        await authSignOut();
        return handleNotLoggedIn();
      }

      setUserData(userData);
      setSessionToken(token);
      return handleLoggedIn();
    } catch {
      authSignOut();
      return handleNotLoggedIn();
    }
  }, []);

  const loginRef = React.useRef(login);
  const signUpRef = React.useRef(signUp);
  const logoutRef = React.useRef(logout);
  const refreshTokenRef = React.useRef(refreshToken);
  const forgotPasswordRef = React.useRef(forgotPassword);
  useEffect(() => {
    loginRef.current = login;
    signUpRef.current = signUp;
    logoutRef.current = logout;
    refreshTokenRef.current = refreshToken;
    forgotPasswordRef.current = forgotPassword;
  }, [login, signUp, logout, refreshToken, forgotPassword]);

  const contextValue: UserContextType = {
    loginRef,
    signUpRef,
    logoutRef,
    userData,
    loggingIn,
    isLoggedIn,
    sessionToken,
    setLoggingIn,
    setIsLoggedIn,
    refreshTokenRef,
    forgotPasswordRef,
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
