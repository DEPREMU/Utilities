import {
  KeyStorageValues,
  ExpectedStorageTypes,
  wrapFunctionWithError,
  ALL_KEYS_STORAGE_TYPE,
  DO_NOT_DELETE_OR_SAVE,
} from "@common";
import { logger } from "../functions/debug";
import { REPLACERS } from "../TOP_LEVEL";
import { fetchToServer } from "../functions/APIManagement";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@refs";
import { storageManagement } from "./storage";
import { setTimeoutPolyfill } from "../functions";
import { notificationsManager } from "./notifications";
import { checkLanguage, tTyped } from "../translates";
import { ResponseAuth, ResponseFetch } from "@types";
import { NotificationAction, UserData } from "@types";
import { NativeFunctionsModule, windowModule } from "@modules";

type SessionData = {
  userData: Omit<UserData, "password"> | null;
  rememberMe: boolean;
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  sessionToken: string | null;
};

type EventSession =
  | "error"
  | "login"
  | "logout"
  | "sessionRefreshed"
  | "refreshingSession";

type ListenersSession = {
  [event in EventSession]?: Record<
    string,
    (...args: ArgsListener<event>) => void
  >;
};

type ArgsListener<T extends EventSession> = T extends
  | "error"
  | "login"
  | "sessionRefreshed"
  ? [error?: string]
  : T extends "logout" | "refreshingSession"
    ? []
    : never;

type AddEventListener = <T extends EventSession>(
  event: T,
  callback: (...args: ArgsListener<T>) => void,
) => () => void;

type EmitEvent = <T extends EventSession>(
  event: T,
  ...args: ArgsListener<T>
) => void;

type RemoveAllListeners = (event?: EventSession) => void;

type Login = (
  email: string,
  password: string,
  rememberMe?: boolean,
  callback?: (error?: string) => void,
) => Promise<void>;

type SignUp = (
  email: string,
  password: string,
  callback?: (success: boolean, error?: string) => void,
) => Promise<void>;

/**
 * Retrieves the Expo push token for the device.
 * On web, it returns "Web" as a placeholder.
 *
 * @returns A promise that resolves to the Expo push token string.
 * @throws Will throw an error if the project ID is not found or if there is an issue fetching the token.
 */
const getDevicePushToken = wrapFunctionWithError(
  async () => {
    if (REPLACERS.isWeb) return "Web";

    const token: string =
      (await Notifications.getDevicePushTokenAsync()).data || "";

    return token;
  },
  true,
  (_, errMsg) => {
    logger.error("Error getting device push token:", errMsg);
    return "";
  },
);

export const saveStorageData = async (
  storageValues?: ExpectedStorageTypes<"BOTH">,
): Promise<boolean> => {
  if (!storageValues) return false;

  const results = await Promise.all(
    Object.entries(storageValues).map(
      wrapFunctionWithError(
        async ([keyStorage, value]) => {
          const keyTyped = keyStorage as ALL_KEYS_STORAGE_TYPE;
          if (!value) return;
          if (DO_NOT_DELETE_OR_SAVE.includes(keyTyped)) return;

          const valueTyped = value as ExpectedStorageTypes<"BOTH">[Exclude<
            KeyStorageValues,
            "DEVICE_ID" | "TERMINAL_COMMANDS"
          >];

          await new Promise<void>((r) => {
            storageManagement.save(keyTyped, valueTyped, () => r());
          });
        },
        true,
        (e) => e,
      ),
    ),
  );

  if (results.some((res) => res)) {
    logger.error("Error saving some storage values");
    return false;
  }
  return true;
};

/**
 * Signs in a user using email and password authentication with Database.
 *
 * @param email - The user's email address
 * @param password - The user's password
 * @param rememberMe - Whether to persist the session for longer duration (default: false)
 * @returns Promise that resolves to an AuthResponse object containing user data, session, and userData on success, or error message on failure
 *
 * @throws Will catch and return any unexpected errors that occur during the authentication process
 */
export const signInWithEmail = async (
  email: string,
  password: string,
  rememberMe: boolean = false,
): Promise<ResponseAuth<"login">> => {
  try {
    const lang = storageManagement.get("LANGUAGE");
    const deviceId = storageManagement.get("DEVICE_ID");
    const notificationToken = await getDevicePushToken();

    const res = await fetchToServer("/auth/login", {
      lang,
      email,
      password,
      deviceId,
      rememberMe,
      notificationToken,
    });

    const dataInsert = res.data;

    if (!dataInsert || !dataInsert?.user) {
      const errorMsg = "No session or user data received from Database";
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    if (dataInsert.error) {
      logger.error("Error signing in:", dataInsert.error);
      return { success: false, error: dataInsert.error };
    }

    logger.log("User signed in successfully:", dataInsert.user.email);

    await saveStorageData(dataInsert.storageValues);
    return {
      user: dataInsert.user,
      token: dataInsert.token || undefined,
      success: true,
    };
  } catch (error) {
    const errorMsg = `Unexpected error during sign in: ${error}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Signs up a new user with email and password using Database Auth
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
): Promise<ResponseAuth<"login">> => {
  try {
    const res = await fetchToServer("/auth/signup", {
      lang: await checkLanguage(),
      email,
      password,
    });

    const data = res.data;

    if (data?.error || !res.ok) {
      const message = data?.error || res.errorText || "Unknown error";
      logger.error("Error signing up:", message);
      return { success: false, error: message };
    }

    return { success: true };
  } catch (error) {
    const errorMsg = `Unexpected error during sign up: ${error}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Sends a password reset email to the user
 */
export const forgotPasswordWithEmail = async (
  email: string,
  callback?: (success: boolean, error?: string) => void,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // const { error } = await database.auth.resetPasswordForEmail(email);
    const error = { message: "Simulated error" }; //! Implement forgot password endpoint in Server

    if (!error) {
      callback?.(true);
      return { success: true };
    }

    logger.error("Error sending forgot password email:", error.message);
    callback?.(false, error.message);
    return { success: false, error: error.message };
  } catch (error) {
    logger.error("Unexpected error sending forgot password email:", error);
    callback?.(false, error as string);
    return { success: false, error: error as string };
  }
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<{ error?: string | null }> => {
  try {
    const storedValues: ALL_KEYS_STORAGE_TYPE[] = [
      "USER_DATA",
      "STREAMERS",
      "PENDING_TASKS",
      "SESSION_EXPIRY",
      "HAS_ADMIN_ACCESS",
      "SELECTED_CRYPTOS",
      "USER_SESSION_TOKEN_STORAGE",
    ];

    await Promise.all(
      storedValues.map((key) => {
        return new Promise<void>((r) => {
          storageManagement.remove(key as ALL_KEYS_STORAGE_TYPE, () => r());
        });
      }),
    );
    if (REPLACERS.isNative) storageManagement.remove("TERMINAL_COMMANDS");

    logger.log("AUTH_SIGN_OUT", "User signed out successfully");
    navigateReplace("Login");
    return {};
  } catch (error) {
    const errorMsg = `AUTH_SIGN_OUT Unexpected error during sign out: ${(error as Error).message}`;
    logger.error(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Gets the current authenticated user
 */
export const getCurrentUser = (): ResponseAuth<"login"> => {
  try {
    const userData = storageManagement.get("USER_DATA");

    return {
      success: !!userData,
      user: userData || undefined,
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting current user: ${error}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Refreshes the current session using a refresh token
 */
export const refreshSession = async (
  token: string,
): Promise<ResponseAuth<"login">> => {
  try {
    const { setTimeoutPolyfill } = await import("../functions");

    const lang = storageManagement.get("LANGUAGE");
    const deviceId = storageManagement.get("DEVICE_ID");
    const notificationToken = await getDevicePushToken();

    let res: ResponseFetch<"/auth/refreshSession"> | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await new Promise((resolve) =>
          setTimeoutPolyfill(resolve, attempt * 500),
        );
        res = await fetchToServer(
          "/auth/refreshSession",
          {
            lang,
            deviceId,
            notificationToken,
          },
          token,
        );

        if (res.ok) break;

        logger.error(
          `Attempt ${attempt + 1} to refresh session failed: ${res.errorText || "Unknown error"}`,
        );
        res = null;
      } catch (error) {
        logger.error("Error refreshing session:", error);
      }
    }
    if (!res) {
      const errorMsg = "Failed to refresh session after multiple attempts";
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = res.data;
    if (!data) {
      const errorMsg =
        "No data received from refresh session" +
        JSON.stringify(res.data || {}, null, 2) +
        res.errorText
          ? `: ${res.errorText} `
          : "";
      logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (data.error) {
      logger.error("Error refreshing session:", data.error);
      if (REPLACERS.isWeb) windowModule.notifyLoginStatus?.(false);
      return { success: false, error: data.error };
    }

    if (!data.token || !data.user) {
      const errorMsg = "No token or user data received from refresh session";
      logger.error(errorMsg);
      signOut();
      return { success: false, error: errorMsg };
    }

    storageManagement.save("USER_DATA", data.user);
    storageManagement.save("USER_SESSION_TOKEN_STORAGE", data.token);
    logger.log("Session refreshed successfully");
    return {
      ...data,
    };
  } catch (error) {
    const errorMsg = `Unexpected error refreshing session: ${error}`;
    logger.error(errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Retrieves user data from the Users table by user ID.
 *
 * @param userId - The unique identifier of the user to retrieve data for
 * @returns A promise that resolves to an object containing either the user data or an error message
 * @returns userData - The user data if successfully retrieved, null if not found, undefined if error occurred
 * @returns error - Error message if an error occurred, null if successful
 */
export const getUserData = async (
  userId: string,
): Promise<{
  userData?: Omit<UserData, "password"> | null;
  error?: string | null;
}> => {
  try {
    const userData = storageManagement.get("USER_DATA");
    if (userData && userData?.userId === userId)
      return { userData, error: null };

    return {
      userData: null,
      error: "User data not found",
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting user data: ${error}`;
    logger.error(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Fetches the current user id from database auth.
 *
 * @returns The user's id if the user is authenticated, otherwise null.
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const { user } = getCurrentUser();
  return user?.userId || null;
};

class SessionManager {
  #i = 0;
  #intervalId: number | null = null;
  #data: SessionData = {
    userData: null,
    isLoggedIn: false,
    rememberMe: false,
    isLoggingIn: false,
    sessionToken: null,
  };

  private notLoggedIn = () => {
    setTimeoutPolyfill(async () => {
      const actions: NotificationAction[] = [
        { actionId: "dismiss", title: tTyped("dismiss"), icon: "delete" },
        { actionId: "stop", title: tTyped("stop"), icon: "stop" },
      ];
      if (
        REPLACERS.isNative &&
        (await NativeFunctionsModule.checkOverlayPermission())
      ) {
        actions.push({
          actionId: "pause",
          title: tTyped("pause"),
          icon: "pause",
        });
      }

      notificationsManager.sendNotification({
        type: "info",
        title: tTyped("youAreNotLoggedIn"),
        actions,
        message: tTyped("youAreNotLoggedInMessage"),
        channelId: "loggedInStatusChannel",
        reasonNotification: "loggedInStatusChannel",
        overrideNotification: false,
      });
    }, 30000);
  };

  private _listeners: ListenersSession = {};

  private _emitEvent: EmitEvent = (event, ...args) => {
    const listeners = this._listeners[event];
    if (!listeners) return;

    Object.values(listeners).forEach((callback) => callback?.(...args));
  };

  public addEventListener: AddEventListener = (event, callback) => {
    if (!REPLACERS.isProduction) {
      if (this.#i > 100) {
        const count = Object.values(this._listeners).reduce(
          (acc, listeners) => acc + Object.keys(listeners || {}).length,
          0,
        );
        if (count > 100) {
          logger.warn(
            "SESSION_MANAGER",
            "Too many session listeners, you may have a memory leak, to suppress this warning set REPLACERS.isDev = false.",
          );
        }
      }
    }

    if (!this._listeners[event]) this._listeners[event] = {};
    const id = `${this.#i++}`;
    this._listeners[event][id] = callback;
    return () => {
      delete this._listeners[event]?.[id];
    };
  };

  public removeAllListeners: RemoveAllListeners = (event?: EventSession) => {
    if (event) delete this._listeners[event];
    else this._listeners = {};
  };

  public refreshSession = async () => {
    try {
      this.#data.isLoggingIn = true;
      const { waitForInternet } = await import("@utils");
      const hasInternet = await waitForInternet(5);
      if (!hasInternet) {
        logger.error(
          "SESSION_MANAGER",
          "No internet connection, cannot refresh session",
        );
        return;
      }

      const rememberMe = storageManagement.get("SESSION_EXPIRY");
      const sessionToken = storageManagement.get("USER_SESSION_TOKEN_STORAGE");

      const handleNotLoggedIn = (reason?: string) => {
        if (reason) logger.log("Not logged in:", reason);
        this.notLoggedIn();
        this._emitEvent("logout");
        this.#data.isLoggedIn = false;
        if (REPLACERS.isWeb) windowModule.notifyLoginStatus?.(false);
      };

      if (!rememberMe || !sessionToken)
        return handleNotLoggedIn("No rememberMe or token");

      if (rememberMe < Date.now()) {
        await signOut();
        return handleNotLoggedIn(`Session expired due to expiry ${rememberMe}`);
      }

      const { user, token, error } = await refreshSession(sessionToken);

      if (error) return handleNotLoggedIn(error);

      if (!user || !token) {
        await signOut();
        return handleNotLoggedIn("No user or token returned");
      }

      this.#data = {
        ...this.#data,
        userData: user,
        rememberMe: this.#data.rememberMe,
        isLoggedIn: true,
        sessionToken: token,
      };
      this._emitEvent("login");
    } catch (error) {
      logger.error(
        "SESSION_MANAGER",
        "Unexpected error refreshing session:",
        error instanceof Error ? error.message : error,
      );
    } finally {
      this.#data.isLoggingIn = false;
    }
  };

  public login: Login = async (
    email,
    password,
    rememberMe = false,
    callback,
  ) => {
    this.#data.isLoggingIn = true;
    this.#data.rememberMe = !!rememberMe;
    try {
      const { user, token, error } = await signInWithEmail(
        email,
        password,
        rememberMe,
      );
      if (error || !user || !token) {
        const errorMsg =
          "SESSION_MANAGER " + error
            ? `Login error: ${error}`
            : "No user or token returned";
        logger.error("Login error:", errorMsg);
        this._emitEvent("login", errorMsg);
        callback?.(errorMsg);
        return;
      }

      this.#data = {
        ...this.#data,
        userData: user,
        rememberMe: this.#data.rememberMe,
        isLoggedIn: true,
        sessionToken: token,
      };
      this._emitEvent("login");
      callback?.();
    } catch (error) {
      callback?.(error instanceof Error ? error.message : String(error));
      logger.error("Unexpected login error:", error);
    } finally {
      this.#data.isLoggingIn = false;
    }
  };

  public logout = async () => {
    await signOut();
    this.#data = {
      ...this.#data,
      userData: null,
      isLoggedIn: false,
      sessionToken: null,
    };
    this._emitEvent("logout");
  };

  public signUp: SignUp = async (email, password, callback) => {
    const { success, error } = await signUpWithEmail(email, password);
    if (!success) {
      const errorMsg =
        "SESSION_MANAGER " + error
          ? `Sign up error: ${error}`
          : "Unknown sign up error";
      logger.error(errorMsg);
    }
    callback?.(success, error);
  };

  public getSessionData = () => this.#data;

  public init = async () => {
    await this.refreshSession();
    const { setIntervalPolyfill, clearIntervalPolyfill } =
      await import("../functions");

    if (this.#intervalId) clearIntervalPolyfill(this.#intervalId);
    this.#intervalId = setIntervalPolyfill(
      () => this.refreshSession(),
      15 * 60 * 1000, //!
    );
  };
}

export const sessionManager = new SessionManager();
