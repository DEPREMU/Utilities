import {
  checkLanguage,
  storageManagement,
} from "../functions/storageManagement";
import {
  KeyStorageValues,
  ExpectedStorageTypes,
  wrapFunctionWithError,
  ALL_KEYS_STORAGE_TYPE,
  DO_NOT_DELETE_OR_SAVE,
} from "@common";
import { logger } from "./debug";
import windowModule from "../modules/WindowModule";
import { REPLACERS } from "../TOP_LEVEL";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@navigation/navigationRef";
import { isFalsy, setTimeoutPolyfill } from "../functions/appManagement";
import { UserData, ResponseAuth, ResponseFetch } from "@types";
import { fetchToServer } from "../functions/APIManagement";

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

    if (!dataInsert || isFalsy(dataInsert?.user)) {
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
  const { user } = await getCurrentUser();
  return user?.userId || null;
};
