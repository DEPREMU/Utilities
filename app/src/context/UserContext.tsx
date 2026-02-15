import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  createContext,
} from "react";
import {
  logger,
  isValidEmail,
  sessionManager,
  saveStorageData,
  storageManagement,
  forgotPasswordWithEmail as authForgotPassword,
} from "@utils";
import { ResponseAuth } from "@types";
import { navigateReplace } from "@refs";
import { BackgroundModule } from "@modules";

type DataRef = {
  isLoggedIn: boolean;
  loginWithQR: (response: ResponseAuth<"login">) => Promise<void>;
  forgotPassword: (
    email: string,
    callback?: (success: boolean, error?: string) => void,
  ) => Promise<void>;
};

interface UserContextType {
  dataRef: React.RefObject<DataRef>;
  loggingIn: boolean;
  isLoggedIn: boolean;
  setLoggingIn: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UserProviderProps {
  children: React.ReactNode;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [loggingIn, setLoggingIn] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const dataRef = useRef<DataRef>({
    isLoggedIn,

    loginWithQR: async (response) => {
      if (!response.success || !response.user || !response.token) {
        logger.error("Invalid QR login response");
        return;
      }
      logger.log("Logging in user with QR successfully:", response.user.email);

      setIsLoggedIn(true);
      await saveStorageData(response.storageValues);
      logger.log("User logged in with QR successfully:", response.user.email);
      navigateReplace("Home");
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
  });

  useEffect(() => {
    const init = async () => {
      sessionManager.addEventListener("sessionRefreshed", (err) => {
        setLoggingIn(false);
        if (err) return;

        const language = storageManagement.get("LANGUAGE");
        const deviceId = storageManagement.get("DEVICE_ID");
        const { sessionToken, userData } = sessionManager.getSessionData();

        BackgroundModule?.setUserData(
          sessionToken || "",
          userData?.userId || "",
          language,
          deviceId,
        );
      });
      sessionManager.addEventListener("logout", () => setIsLoggedIn(false));
      sessionManager.addEventListener("refreshingSession", () => {
        setLoggingIn(true);
      });

      await sessionManager.init();
    };
    init();
  }, []);

  const value: UserContextType = useMemo(
    () => ({
      dataRef,
      loggingIn,
      isLoggedIn,
      setLoggingIn,
    }),
    [loggingIn, isLoggedIn],
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
