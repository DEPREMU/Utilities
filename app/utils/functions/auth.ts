import {
  UserData,
  RequestAuth,
  ResponseAuth,
  RequestSignOut,
  ResponseSignOut,
  ExpectedStorageTypes,
  RequestRefreshSession,
  ResponseRefreshSession,
} from "@types";
import {
  log,
  logError,
  saveData,
  removeData,
  isSecureKey,
  getRouteAPI,
  fetchOptions,
  checkLanguage,
  saveDataSecure,
  loadDataSecure,
  removeDataSecure,
  cleanAllStorageData,
} from "../functions";
import chalk from "chalk";
import { isFalsy } from "./../functions/appManagement";
import { Platform } from "react-native";
import windowModule from "../modules/WindowModule";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@navigation/navigationRef";
import { KeyStorageValues, ALL_KEYS_STORAGE_TYPE } from "../constants";

/**
 * Auth response type for consistent error handling
 */
export type AuthResponse = {
  token?: string | null;
  error?: string | null;
  userData?: Omit<UserData, "password"> | null;
};

/**
 * Retrieves the Expo push token for the device.
 * On web, it returns "Web" as a placeholder.
 *
 * @returns A promise that resolves to the Expo push token string.
 * @throws Will throw an error if the project ID is not found or if there is an issue fetching the token.
 */
const getDevicePushToken = async (): Promise<string> => {
  if (Platform.OS === "web") return "Web";

  const token = (await Notifications.getDevicePushTokenAsync()).data || "";

  return token;
};

const saveStorageData = async (
  storageValues?: ExpectedStorageTypes<"BOTH">,
): Promise<boolean> => {
  if (!storageValues) return false;

  const results = await Promise.all(
    Object.entries(storageValues).map(([key, value]) => {
      const keyTyped = key as KeyStorageValues;
      if (keyTyped === "_deviceId" || keyTyped === "_terminalCommands") return;

      const valueTyped = value as ExpectedStorageTypes<"BOTH">[Exclude<
        KeyStorageValues,
        "_deviceId" | "_terminalCommands"
      >];

      if (!isSecureKey(keyTyped)) saveData(keyTyped, valueTyped);
      else saveDataSecure(keyTyped, valueTyped);
    }),
  );

  if (results.some((res) => res)) {
    logError("Error saving some storage values");
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
 * @example
 * ```typescript
 * const result = await signInWithEmail("user@example.com", "password123", true);
 * if (result.error) {
 *   logError("Sign in failed:", result.error);
 * } else {
 *   log("User signed in:", result.user?.email);
 * }
 * ```
 *
 * @throws Will catch and return any unexpected errors that occur during the authentication process
 */
export const signInWithEmail = async (
  email: string,
  password: string,
  rememberMe: boolean = false,
): Promise<AuthResponse> => {
  try {
    const [lang, deviceId] = await Promise.all([
      checkLanguage(),
      loadDataSecure("_deviceId"),
    ]);
    let notificationToken = "Web";
    if (Platform.OS !== "web") notificationToken = await getDevicePushToken();

    const res = await fetch(
      await getRouteAPI("/auth/login"),
      fetchOptions<RequestAuth>("POST", {
        lang,
        email,
        password,
        deviceId: deviceId || undefined,
        notificationToken,
        rememberMe,
      }),
    );
    const dataInsert = (await res.json()) as ResponseAuth;

    if (isFalsy(dataInsert.user)) {
      const errorMsg = "No session or user data received from Database";
      logError(errorMsg);
      return { error: errorMsg };
    }
    if (dataInsert.error) {
      logError("Error signing in:", dataInsert.error);
      return { error: dataInsert.error };
    }

    log("User signed in successfully:", dataInsert.user.email);

    await saveStorageData(dataInsert.storageValues);
    return {
      token: dataInsert.token || null,
      userData: dataInsert.user,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error during sign in: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Signs up a new user with email and password using Database Auth
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    const res = await fetch(
      await getRouteAPI("/auth/signup"),
      fetchOptions<RequestAuth>("POST", {
        lang: await checkLanguage(),
        email,
        password,
      }),
    );
    const data = (await res.json()) as ResponseAuth;

    if (data.error) {
      logError("Error signing up:", data.error);
      return { error: data.error };
    }

    return { error: null };
  } catch (error) {
    const errorMsg = `Unexpected error during sign up: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
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

    logError("Error sending forgot password email:", error.message);
    callback?.(false, error.message);
    return { success: false, error: error.message };
  } catch (error) {
    logError("Unexpected error sending forgot password email:", error);
    callback?.(false, error as string);
    return { success: false, error: error as string };
  }
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<{ error?: string | null }> => {
  try {
    const [deviceId, lang, token] = await Promise.all([
      loadDataSecure("_deviceId"),
      checkLanguage(),
      loadDataSecure("_userSessionTokenStorage"),
    ]);
    if (!token) return { error: "No session token found" };

    let notificationToken = "Web";
    if (Platform.OS !== "web") notificationToken = await getDevicePushToken();

    const res = await fetch(
      await getRouteAPI("/auth/signOut"),
      fetchOptions<RequestSignOut>(
        "POST",
        {
          deviceId: deviceId as string,
          notificationToken,
          lang,
        },
        token,
      ),
    );
    const data = (await res.json()) as ResponseSignOut;

    if (data.error) {
      logError("Error signing out:", data.error);
      return { error: data.error };
    }

    const storedValues: ALL_KEYS_STORAGE_TYPE[] = [
      "@API_URL",
      "@webSocketURL",
      "@notifications",
      "@hasAdminAccess",
      "_userData",
      "_Streamers",
      "_sessionExpiry",
      "_selectedCryptos",
      "_userSessionTokenStorage",
    ];

    await Promise.all(
      storedValues.map((key) =>
        !isSecureKey(key) ? removeData(key) : removeDataSecure(key),
      ),
    );
    if (Platform.OS !== "web") removeDataSecure("_terminalCommands");

    log("User signed out successfully");
    navigateReplace("Login");
    return { error: null };
  } catch (error) {
    const errorMsg = `Unexpected error during sign out: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Gets the current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    const userData = await loadDataSecure("_userData");

    return {
      userData: userData || null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting current user: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Refreshes the current session using a refresh token
 */
export const refreshSession = async (
  token: string,
  tries = 0,
): Promise<AuthResponse> => {
  if (tries > 10) {
    const errorMsg = "Maximum retry attempts reached for refreshing session";
    logError(errorMsg);
    return { error: errorMsg };
  }

  try {
    const [lang, deviceId, url] = await Promise.all([
      checkLanguage(),
      loadDataSecure("_deviceId"),
      getRouteAPI("/auth/refreshSession"),
    ]);

    let notificationToken = "Web";
    if (Platform.OS !== "web") notificationToken = await getDevicePushToken();

    if (!deviceId) {
      cleanAllStorageData();
      logError(chalk.red("No device ID found"));
      return { error: "No device ID found" };
    }

    const res = await fetch(
      url,
      fetchOptions<RequestRefreshSession>(
        "POST",
        {
          lang,
          deviceId,
          notificationToken,
        },
        token,
      ),
    ).catch(async (error) => {
      logError(
        `Error refreshing session, retrying... (${tries + 1}/10): ${error}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 500 * (tries + 1)));
      const data = await refreshSession(token, tries + 1);
      return { json: () => data };
    });
    const data = (await res.json()) as ResponseRefreshSession;

    if (data.error) {
      logError("Error refreshing session:", data.error);
      if (Platform.OS === "web") windowModule.notifyLoginStatus?.(false);
      return { error: data.error };
    }

    if (!data.token || !data.userData) {
      const errorMsg = "No token or user data received from refresh session";
      logError(errorMsg);
      signOut();
      return { error: errorMsg };
    }
    await saveDataSecure("_userSessionTokenStorage", data.token);
    log("Session refreshed successfully");
    return {
      ...data,
    };
  } catch (error) {
    const errorMsg = `Unexpected error refreshing session: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Retrieves user data from the Users table by user ID.
 *
 * @param userId - The unique identifier of the user to retrieve data for
 * @returns A promise that resolves to an object containing either the user data or an error message
 * @returns userData - The user data if successfully retrieved, null if not found, undefined if error occurred
 * @returns error - Error message if an error occurred, null if successful
 *
 * @example
 * ```typescript
 * const { userData, error } = await getUserData("user-123");
 * if (error) {
 *   logError("Failed to get user data:", error);
 * } else {
 *   log("User data:", userData);
 * }
 * ```
 */
export const getUserData = async (
  userId: string,
): Promise<{
  userData?: Omit<UserData, "password"> | null;
  error?: string | null;
}> => {
  try {
    const userData = await loadDataSecure("_userData");
    if (userData && userData?.userId === userId)
      return { userData, error: null };

    return {
      userData: null,
      error: "User data not found",
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting user data: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Fetches the current user id from database auth.
 *
 * @returns The user's id if the user is authenticated, otherwise null.
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const { userData } = await getCurrentUser();
  return userData?.userId || null;
};
