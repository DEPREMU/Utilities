import {
  log,
  logError,
  saveData,
  removeData,
  isSecureKey,
  checkLanguage,
  fetchToServer,
  saveDataSecure,
  loadDataSecure,
  removeDataSecure,
  cleanAllStorageData,
} from "../functions";
import { isFalsy } from "./../functions/appManagement";
import { Platform } from "react-native";
import windowModule from "../modules/WindowModule";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@navigation/navigationRef";
import { KeyStorageValues, ALL_KEYS_STORAGE_TYPE } from "../constants";
import { UserData, ExpectedStorageTypes, ResponseFetch } from "@types";

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
    if (!deviceId) {
      const errorMsg = "No device ID found";
      logError(errorMsg);
      return { error: errorMsg };
    }

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
    const res = await fetchToServer("/auth/signup", {
      lang: await checkLanguage(),
      email,
      password,
    });

    const data = res.data;

    if (data?.error || !res.ok) {
      const message = data?.error || res.errorText || "Unknown error";
      logError("Error signing up:", message);
      return { error: message };
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

    const res = await fetchToServer(
      "/auth/signOut",
      {
        deviceId: deviceId as string,
        notificationToken,
        lang,
      },
      token,
    );

    const data = res.data;
    if (!res.ok || !data) {
      const message = res.errorText || "Unknown error";
      logError("Error signing out:", message);
      return { error: message };
    }

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
export const refreshSession = async (token: string): Promise<AuthResponse> => {
  try {
    const [lang, deviceId] = await Promise.all([
      checkLanguage(),
      loadDataSecure("_deviceId"),
    ]);

    let notificationToken = "Web";
    if (Platform.OS !== "web") notificationToken = await getDevicePushToken();

    if (!deviceId) {
      cleanAllStorageData();
      logError("No device ID found");
      return { error: "No device ID found" };
    }

    let res: ResponseFetch<"/auth/refreshSession"> | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
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

        logError(
          `Attempt ${attempt + 1} to refresh session failed: ${res.errorText || "Unknown error"}`,
        );
        res = null;
      } catch (error) {
        logError("Error refreshing session:", error);
      }
    }
    if (!res) {
      const errorMsg = "Failed to refresh session after multiple attempts";
      logError(errorMsg);
      return { error: errorMsg };
    }

    const data = res.data;
    if (!data) {
      const errorMsg = "No data received from refresh session";
      logError(errorMsg);
      return { error: errorMsg };
    }

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
