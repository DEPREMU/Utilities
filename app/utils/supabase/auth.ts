import { isFalsy } from "./../functions/appManagement";
import {
  Tables,
  UserData,
  PushTokens,
  TablesKeys,
  SessionStored,
  Notifications as NotificationsType,
  ReasonNotification,
} from "@types";
import {
  log,
  logError,
  saveData,
  checkLanguage,
  saveDataSecure,
  loadDataSecure,
  removeDataSecure,
  getDateWithDaysAhead,
  removeData,
} from "../functions";
import { supabase } from "./supabase";
import { deleteInTable, fetchFromTable } from "./functions";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@navigation/navigationRef";
import type { User, Session } from "@supabase/supabase-js";
import {
  KeyStorageValues,
  reasonNotification,
  SelectedCryptos,
} from "../constants";
import { Platform } from "react-native";

/**
 * Auth response type for consistent error handling
 */
export type AuthResponse = {
  user?: User | null;
  session?: SessionStored | null;
  userData?: UserData | null;
  error?: string | null;
};

/**
 * Inserts an Expo push notification token into the database for a given user.
 *
 * This function retrieves the current Expo push token for the device and stores it
 * in the PushTokens table associated with the provided user ID. The token is used
 * for sending push notifications to the user's device.
 *
 * @param userId - The unique identifier of the user to associate with the push token
 * @returns A promise that resolves to an object containing an error property.
 *          If successful, error will be null. If an error occurs, error will contain
 *          the error message as a string.
 *
 * @example
 * ```typescript
 * const result = await insertTokenToDB("user123");
 * if (result.error) {
 *   console.error("Failed to insert token:", result.error);
 * } else {
 *   console.log("Token inserted successfully");
 * }
 * ```
 */
const insertTokenToDB = async (
  userId: string,
): Promise<{ error?: string | null }> => {
  try {
    if (Platform.OS === "web") {
      log("Push notifications are not supported on web platforms.");
      return { error: null };
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    insertIntoTable<PushTokens>("PushTokens", {
      token,
      userId,
    });
    return { error: null };
  } catch (error) {
    logError("Error getting push token:", error);
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Saves user authentication and configuration data to local storage after successful login.
 *
 * This function fetches user data, cryptos, notification settings, and user configuration
 * from the database, then stores the processed data in various storage mechanisms
 * (secure storage and regular storage) for offline access.
 *
 * @param userId - The unique identifier of the user
 * @param session - The authentication session object containing tokens and expiry information
 * @param rememberMe - Whether to extend the session expiry (15 days if true, otherwise session-based)
 *
 * @returns A promise that resolves to an object containing the user data or null if not found
 *
 * @example
 * ```typescript
 * const result = await saveStorageData(
 *   "user-123",
 *   session,
 *   true
 * );
 * console.log(result.userData);
 * ```
 */
export const saveStorageData = async (
  userId: string,
  session: Session,
  rememberMe: boolean,
): Promise<{ userData: UserData | null }> => {
  const [users, cryptos, userConfig, userNotificationsConfig] =
    await Promise.all([
      supabase.from("Users").select("*").limit(1).eq("uid", userId).single(),
      fetchFromTable<Tables["Cryptos"]>("Cryptos", { userId }),
      fetchFromTable<Tables["UserConfig"]>("UserConfig", { userId }),
      fetchFromTable<Tables["UserNotificationsConfig"]>(
        "UserNotificationsConfig",
        { userId },
      ),
    ]);

  const streamers: NotificationsType["enabled"]["streamers"] =
    Object.fromEntries(
      userNotificationsConfig.data
        ?.filter(
          (config) =>
            config.reason === "streamers" && !isFalsy(config.streamer),
        )
        .map((config) => [
          config.streamer,
          {
            name: config.streamer,
            enabled: config.enabled,
          },
        ]) || [],
    );

  const cryptosToSave: SelectedCryptos =
    cryptos.data?.reduce((acc, crypto) => {
      acc[crypto.id + crypto.currency] = crypto;
      return acc;
    }, {} as SelectedCryptos) || {};
  const userNotificationsConfigToSave = userNotificationsConfig.data?.reduce(
    (acc, config) => {
      const reason = config.reason as ReasonNotification;
      if (reason === "streamers") acc.enabled[reason] = streamers;
      else acc.enabled[reason] = config.enabled;
      acc.data[reason] = null;
      acc.intervals[reason] = config.interval;
      return acc;
    },
    { enabled: {}, data: {}, intervals: {} } as NotificationsType,
  );
  const sessionToSave: SessionStored = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
    expires_at: session.expires_at,
    provider_refresh_token: session.provider_refresh_token,
    provider_token: session.provider_token,
  };
  const userConfigToSave: Tables["UserConfig"] = {
    userId,
    language: userConfig.data?.[0]?.language || (await checkLanguage()),
    hasAdmin: userConfig.data?.[0]?.hasAdmin || false,
    updatedAt: new Date().toISOString(),
    theme: userConfig.data?.[0]?.theme || "auto",
    webSocketURL: userConfig.data?.[0]?.webSocketURL || "",
    API_URL: userConfig.data?.[0]?.API_URL || "",
  };
  let date = -1;
  if (rememberMe) date = getDateWithDaysAhead(15).getTime();

  await Promise.all([
    insertTokenToDB(userId),
    saveDataSecure("_sessionExpiry", date),
    saveDataSecure("_selectedCryptos", cryptosToSave),
    saveDataSecure("_userSessionStorage", sessionToSave),
    saveData("@API_URL", userConfigToSave.API_URL || ""),
    saveData("@hasAdminAccess", userConfigToSave.hasAdmin),
    saveData("@notifications", userNotificationsConfigToSave),
    saveData("@languageKeyStorage", userConfigToSave.language),
    saveData("@webSocketURL", userConfigToSave.webSocketURL || ""),
    saveData("@theme", userConfigToSave.theme || "auto"),
  ]);

  return { userData: users.data || null };
};

/**
 * Signs in a user using email and password authentication with Supabase.
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
 *   console.error("Sign in failed:", result.error);
 * } else {
 *   console.log("User signed in:", result.user?.email);
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const errorMsg = "No session or user data received from Supabase";
      logError(errorMsg);
      return { error: errorMsg };
    }
    if (error) {
      logError("Error signing in:", error.message);
      return { error: error.message };
    }

    if (!data.session || !data.user) {
      const errorMsg = "No session or user data received from Supabase";
      logError(errorMsg);
      return { error: errorMsg };
    }

    log("User signed in successfully:", data.user.email);

    const { userData } = await saveStorageData(
      data.user.id,
      data.session,
      rememberMe,
    );
    return {
      user: data.user,
      userData,
      session: data.session,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error during sign in: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Signs up a new user with email and password using Supabase Auth
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      logError("Error signing up:", error.message);
      return { error: error.message };
    }
    if (data.user)
      handleCreateUserInitialData(data.user.id, data.user.email || "");

    return {
      ...data,
      error: null,
    };
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
    const { error } = await supabase.auth.resetPasswordForEmail(email);

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
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signOut();

    if (data.user?.id)
      deleteInTable<PushTokens>(data.user.id, "PushTokens", {
        userId: data.user.id,
        token: await Notifications.getExpoPushTokenAsync().then((t) => t.data),
      });

    if (error) {
      logError("Error signing out:", error.message);
      return { error: error.message };
    }

    const storedValues: KeyStorageValues[] = [
      "@API_URL",
      "@webSocketURL",
      "@notifications",
      "@hasAdminAccess",
      "_sessionExpiry",
      "_selectedCryptos",
      "_userSessionStorage",
    ];

    await Promise.all(
      storedValues.map((key) =>
        key.startsWith("@") ? removeData(key) : removeDataSecure(key),
      ),
    );
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
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      logError("Error getting current user:", error.message);
      return { error: error.message };
    }

    const session = await supabase.auth.getSession();

    return {
      user: data.user,
      session: session.data.session,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting current user: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Gets the current session
 */
export const getCurrentSession = async (): Promise<AuthResponse> => {
  try {
    const {
      data: { session: sessionSupabase },
      error,
    } = await supabase.auth.getSession();
    let session: Session | null = sessionSupabase || null;
    if (!session) {
      session = (await loadDataSecure<Session>("_userSessionStorage")) || null;

      const { data } = await supabase.auth.refreshSession({
        refresh_token: session?.refresh_token || "",
      });

      session = data?.session;
    }

    if (error || !session) {
      logError("Error getting session:", error?.message);
      return { error: error?.message || "No session found" };
    }
    const [{ data: userData }] = await Promise.all([
      supabase.from("Users").select("*").eq("uid", session?.user.id).single(),
      saveDataSecure("_userSessionStorage", { ...session, user: null }),
    ]);

    return {
      session,
      userData: userData as UserData,
      error: null,
      user: session?.user || null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting session: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Refreshes the current session using a refresh token
 */
export const refreshSession = async (
  refreshToken: string,
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      logError("Error refreshing session:", error.message);
      return { error: error.message };
    }

    log("Session refreshed successfully");
    return {
      ...data,
      error: null,
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
 *   console.error("Failed to get user data:", error);
 * } else {
 *   console.log("User data:", userData);
 * }
 * ```
 */
export const getUserData = async (
  userId: string,
): Promise<{
  userData?: UserData | null;
  error?: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("Users")
      .select()
      .eq("userId", userId)
      .single();

    if (error) {
      logError("Error getting user data:", error.message);
      return { error: error.message };
    }

    log("User data retrieved successfully:", userId);
    return {
      userData: data,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error getting user data: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Inserts data into a specified Supabase table.
 *
 * @template T - The type of data being inserted
 * @param table - The name of the table to insert data into. Defaults to "Users"
 * @param data - The data to insert. Can be a single object or an array of objects
 * @returns A promise that resolves to an object containing an optional error message
 *
 * @example
 * ```typescript
 * // Insert a single user
 * const result = await insertIntoTable("Users", { name: "John", email: "john@example.com" });
 *
 * // Insert multiple records
 * const result = await insertIntoTable("Posts", [
 *   { title: "Post 1", content: "Content 1" },
 *   { title: "Post 2", content: "Content 2" }
 * ]);
 * ```
 */
export const insertIntoTable = async <T = unknown>(
  table: TablesKeys = "Users",
  data: T | T[],
): Promise<{
  error?: string | null;
}> => {
  try {
    const { error } = await supabase.from(table).insert(data);

    if (error) {
      logError("Error creating user record:", error.message);
      return { error: error.message };
    }

    log("User record created successfully:", data);
    return { error: null };
  } catch (error) {
    const errorMsg = `Unexpected error creating record: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Handles the creation of initial user data in various tables after sign-up
 *
 * @param userId - The ID of the newly created user
 * @param email - The email of the newly created user
 */
export const handleCreateUserInitialData = async (
  userId: string,
  email: string,
) => {
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } catch {
    token = "";
  }

  const pushTokens: Tables["PushTokens"] = { token, userId };
  const user: Tables["Users"] = {
    email,
    uid: userId,
    name: "",
    phone: "",
    description: "",
  };
  const userNotificationsConfig: Tables["UserNotificationsConfig"][] =
    reasonNotification.map((reason) => ({
      userId,
      reason,
      enabled: false,
      interval: reason === "allNotifications" ? -1 : 6 * 60 * 1000,
      updatedAt: new Date().toISOString(),
      isActive: true,
    }));
  const userConfig: Tables["UserConfig"] = {
    userId,
    language: await checkLanguage(),
    hasAdmin: false,
    updatedAt: new Date().toISOString(),
    theme: "auto",
  };

  const initialData: Record<
    TablesKeys,
    Tables[TablesKeys][] | Tables[TablesKeys]
  > = {
    Cryptos: [],
    PushTokens: pushTokens,
    Streamers: [],
    ClipboardSync: [],
    Users: user,
    Logs: [],
    UserNotificationsConfig: userNotificationsConfig,
    UserConfig: userConfig,
  };

  await Promise.all(
    Object.entries(initialData).map(async ([table, data]) => {
      if (Array.isArray(data) && data.length === 0) return;
      if (!data) return;
      await insertIntoTable(table as TablesKeys, data);
    }),
  );
};

/**
 * Fetches the current user id from supabase auth.
 *
 * @returns The user's id if the user is authenticated, otherwise null.
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const { user } = await getCurrentUser();
  return user?.id || null;
};
