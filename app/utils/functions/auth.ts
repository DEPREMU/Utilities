import {
  UserData,
  ResponseAuth,
  ResponseFetch,
  ExpectedStorageTypes,
} from "@types";
import {
  log,
  logError,
  checkLanguage,
  fetchToServer,
  saveDataStorage,
  loadDataStorage,
  removeDataStorage,
  cleanAllStorageData,
} from "../functions";
import { Platform } from "react-native";
import windowModule from "../modules/WindowModule";
import { reloadAppAsync } from "expo";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@navigation/navigationRef";
import { wrapFunctionWithError } from "@common";
import { isFalsy, setTimeoutPolyfill } from "./../functions/appManagement";
import { KeyStorageValues, ALL_KEYS_STORAGE_TYPE } from "@common";

/**
 * Retrieves the Expo push token for the device.
 * On web, it returns "Web" as a placeholder.
 *
 * @returns A promise that resolves to the Expo push token string.
 * @throws Will throw an error if the project ID is not found or if there is an issue fetching the token.
 */
const getDevicePushToken = wrapFunctionWithError(
  async () => {
    if (Platform.OS === "web") return "Web";

    const token: string =
      (await Notifications.getDevicePushTokenAsync()).data || "";

    return token;
  },
  true,
  (_, errMsg) => {
    logError("Error getting device push token:", errMsg);
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
        async ([key, value]) => {
          const keyTyped = key as ALL_KEYS_STORAGE_TYPE;
          if (keyTyped === "_deviceId" || keyTyped === "_terminalCommands")
            return;

          const valueTyped = value as ExpectedStorageTypes<"BOTH">[Exclude<
            KeyStorageValues,
            "_deviceId" | "_terminalCommands"
          >];

          saveDataStorage(keyTyped, valueTyped);
        },
        true,
        (e) => e,
      ),
    ),
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
): Promise<ResponseAuth<"login">> => {
  try {
    const [lang, deviceId, notificationToken] = await Promise.all([
      checkLanguage(),
      loadDataStorage("_deviceId"),
      getDevicePushToken(),
    ]);

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
      return { success: false, error: errorMsg };
    }
    if (dataInsert.error) {
      logError("Error signing in:", dataInsert.error);
      return { success: false, error: dataInsert.error };
    }

    log("User signed in successfully:", dataInsert.user.email);

    await saveStorageData(dataInsert.storageValues);
    return {
      user: dataInsert.user,
      token: dataInsert.token || undefined,
      success: true,
    };
  } catch (error) {
    const errorMsg = `Unexpected error during sign in: ${error}`;
    logError(errorMsg);
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
      logError("Error signing up:", message);
      return { success: false, error: message };
    }

    return { success: true };
  } catch (error) {
    const errorMsg = `Unexpected error during sign up: ${error}`;
    logError(errorMsg);
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
    const [deviceId, lang, token, notificationToken] = await Promise.all([
      loadDataStorage("_deviceId"),
      checkLanguage(),
      loadDataStorage("_userSessionTokenStorage"),
      getDevicePushToken(),
    ]);

    if (!token) return { error: "No session token found" };

    const res = await fetchToServer(
      "/auth/signOut",
      {
        lang,
        deviceId,
        notificationToken,
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

    await Promise.all(storedValues.map(removeDataStorage));
    if (Platform.OS !== "web") removeDataStorage("_terminalCommands");

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
export const getCurrentUser = async (): Promise<ResponseAuth<"login">> => {
  try {
    const userData = await loadDataStorage("_userData");

    return {
      success: !!userData,
      user: userData || undefined,
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting current user: ${error}`;
    logError(errorMsg);
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
    const [lang, deviceId, notificationToken] = await Promise.all([
      checkLanguage(),
      loadDataStorage("_deviceId"),
      getDevicePushToken(),
    ]);

    if (!deviceId) {
      cleanAllStorageData();
      logError("No device ID found");
      if (Platform.OS === "android") await reloadAppAsync();
      else window?.location?.reload();
      return { success: false, error: "No device ID found" };
    }

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
      logError(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (data.error) {
      logError("Error refreshing session:", data.error);
      if (Platform.OS === "web") windowModule.notifyLoginStatus?.(false);
      return { success: false, error: data.error };
    }

    if (!data.token || !data.user) {
      const errorMsg = "No token or user data received from refresh session";
      logError(errorMsg);
      signOut();
      return { success: false, error: errorMsg };
    }

    saveDataStorage("_userData", data.user);
    saveDataStorage("_userSessionTokenStorage", data.token);
    log("Session refreshed successfully");
    return {
      ...data,
    };
  } catch (error) {
    const errorMsg = `Unexpected error refreshing session: ${error}`;
    logError(errorMsg);
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
    const userData = await loadDataStorage("_userData");
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
  const { user } = await getCurrentUser();
  return user?.userId || null;
};
