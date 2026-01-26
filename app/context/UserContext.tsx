import {
  logger,
  signOut,
  REPLACERS,
  isValidEmail,
  loadDataStorage,
  signInWithEmail,
  signUpWithEmail,
  saveStorageData,
  signOut as authSignOut,
  refreshSession as authRefreshSession,
  forgotPasswordWithEmail as authForgotPassword,
} from "@utils";
import windowModule from "@/utils/modules/WindowModule";
import { navigateReplace } from "@navigation/navigationRef";
import { ResponseAuth, UserData } from "@types";
import React, { useRef, useMemo, useState, createContext } from "react";

type DataRef = {
  userData: Omit<UserData, "password"> | null;
  isLoggedIn: boolean;
  sessionToken: string | null;
  login: <T = null>(
    email: string,
    password: string,
    rememberMe?: boolean,
    callback?: (success: boolean, error?: string) => T,
  ) => Promise<T | undefined>;
  signUp: <T = void>(
    email: string,
    password: string,
    callback?: (success: boolean, error?: string) => T,
  ) => Promise<T | undefined>;
  logout: (callback?: (success: boolean) => void) => Promise<void>;
  loginWithQR: (response: ResponseAuth<"login">) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  forgotPassword: (
    email: string,
    callback?: (success: boolean, error?: string) => void,
  ) => Promise<void>;
};

interface UserContextType {
  dataRef: React.RefObject<DataRef>;
  userData: DataRef["userData"];
  loggingIn: boolean;
  isLoggedIn: boolean;
  sessionToken: DataRef["sessionToken"];
  setLoggingIn: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UserProviderProps {
  children: React.ReactNode;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [userData, setUserData] = useState<DataRef["userData"]>(null);
  const [loggingIn, setLoggingIn] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const dataRef = useRef<DataRef>({
    userData,
    isLoggedIn,
    sessionToken,
    login: async (email, password, rememberMe = false, callback) => {
      try {
        setLoggingIn(true);
        const { user, token, error } = await signInWithEmail(
          email,
          password,
          rememberMe,
        );

        if (error) return callback?.(false, error);

        if (user && token) {
          setUserData(user || null);
          setSessionToken(token);
          setIsLoggedIn(true);
          logger.log("User logged in successfully:", user.email);
          return callback?.(true);
        } else {
          const errorMsg = "No user or session data received";
          return callback?.(false, errorMsg);
        }
      } catch (error) {
        const errorMsg = `Login error: ${error}`;
        logger.error(errorMsg);
        return callback?.(false, errorMsg);
      } finally {
        setLoggingIn(false);
      }
    },
    loginWithQR: async (response) => {
      if (!response.success || !response.user || !response.token) {
        logger.error("Invalid QR login response");
        return;
      }
      logger.log("Logging in user with QR successfully:", response.user.email);

      setUserData(response.user);
      setIsLoggedIn(true);
      setSessionToken(response.token);
      await saveStorageData(response.storageValues);
      logger.log("User logged in with QR successfully:", response.user.email);
      navigateReplace("Home");
    },
    signUp: async (email, password, callback) => {
      try {
        const { error } = await signUpWithEmail(email, password);

        if (error) return callback?.(false, error);

        logger.log("User signed up successfully:", email);
        callback?.(true);
      } catch (error) {
        const errorMsg = `Sign up error: ${error}`;
        logger.error(errorMsg);
        return callback?.(false, errorMsg);
      } finally {
        setLoggingIn(false);
      }
      return callback?.(true);
    },
    logout: async (callback) => {
      try {
        const { error } = await authSignOut();

        if (error) {
          logger.error("Logout error:", error);
          callback?.(false);
          return;
        }

        setSessionToken(null);
        setUserData(null);
        setIsLoggedIn(false);
        navigateReplace("Login");
        logger.log("User logged out successfully");
        callback?.(true);
      } catch (error) {
        logger.error("Unexpected logout error:", error);
        callback?.(false);
      } finally {
        setLoggingIn(false);
      }
    },
    forgotPassword: async (
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
          logger.error("Forgot password error:", error);
          callback?.(false, error);
          return;
        }

        callback?.(true);
      } catch (error) {
        logger.error("Unexpected forgot password error:", error);
        callback?.(false, error as string);
      } finally {
        setLoggingIn(false);
      }
    },
    refreshToken: async (): Promise<boolean> => {
      const sendNotificationLoginStatus = !REPLACERS.isWeb
        ? () => {}
        : (isLoggedIn: boolean) =>
            windowModule?.notifyLoginStatus?.(isLoggedIn);
      const handleNotLoggedIn = (reason?: string) => {
        if (reason) logger.log("Not logged in:", reason);

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
          loadDataStorage("SESSION_EXPIRY"),
          loadDataStorage("USER_SESSION_TOKEN_STORAGE"),
        ]);

        if (!rememberMe || !sessionToken)
          return handleNotLoggedIn("No rememberMe or token");

        if (rememberMe < Date.now()) {
          await signOut();
          return handleNotLoggedIn(
            `Session expired due to expiry ${rememberMe}`,
          );
        }

        setLoggingIn(true);

        const { user, token, error } = await authRefreshSession(sessionToken);

        if (error) return handleNotLoggedIn();

        if (!user || !token) {
          await authSignOut();
          return handleNotLoggedIn("No user or token returned");
        }

        setUserData(user);
        setSessionToken(token);
        return handleLoggedIn();
      } catch {
        authSignOut();
        return handleNotLoggedIn();
      }
    },
  });

  const value: UserContextType = useMemo(
    () => ({
      dataRef,
      userData,
      loggingIn,
      isLoggedIn,
      sessionToken,
      setLoggingIn,
      setIsLoggedIn,
    }),
    [isLoggedIn, loggingIn, sessionToken, userData],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
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
