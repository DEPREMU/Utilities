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
  saveDataSecure,
  loadDataSecure,
  getDateWithDaysAhead,
  removeDataSecure,
  saveData,
  checkLanguage,
} from "../functions";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@navigation/navigationRef";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";
import { reasonNotification, SelectedCryptos } from "../constants";
import { fetchFromTable } from "./functions";

/**
 * Auth response type for consistent error handling
 */
export type AuthResponse = {
  user?: User | null;
  session?: SessionStored | null;
  userData?: UserData | null;
  error?: string | null;
};

const insertTokenToDB = async (
  userId: string,
): Promise<{ error?: string | null }> => {
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    console.log(
      "Push token:",
      token,
      userId,
      await Notifications.getExpoPushTokenAsync(),
    );

    await insertIntoTable<PushTokens>("PushTokens", {
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
 * Signs in a user with email and password using Supabase Auth
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

    let date = -1;
    if (rememberMe) date = getDateWithDaysAhead(15).getTime();

    if (!data.session || !data.user) {
      const errorMsg = "No session or user data received from Supabase";
      logError(errorMsg);
      return { error: errorMsg };
    }

    log("User signed in successfully:", data.user.email);

    const [users, cryptos, userNotificationsConfig, userConfig] =
      await Promise.all([
        supabase
          .from("Users")
          .select("*")
          .limit(1)
          .eq("uid", data.user.id)
          .single(),
        fetchFromTable<Tables["Cryptos"]>("Cryptos", {
          userId: data.user.id,
        }),
        fetchFromTable<Tables["UserNotificationsConfig"]>(
          "UserNotificationsConfig",
          {
            userId: data.user.id,
          },
        ),
        fetchFromTable<Tables["UserConfig"]>("UserConfig", {
          userId: data.user.id,
        }),
      ]);

    const cryptosToSave: SelectedCryptos =
      cryptos.data?.reduce((acc, crypto) => {
        acc[[crypto.id, crypto.currency].join("")] = crypto;
        return acc;
      }, {} as SelectedCryptos) || {};
    const userNotificationsConfigToSave: NotificationsType = {
      enabled: {} as NotificationsType["enabled"],
      data: {} as NotificationsType["data"],
      intervals: {} as NotificationsType["intervals"],
    };
    userNotificationsConfig.data?.reduce((acc, config) => {
      const reason = config.reason as ReasonNotification;
      acc.enabled[reason] = config.enabled;
      acc.data[reason] = null;
      acc.intervals[reason] = config.interval;
      return acc;
    }, userNotificationsConfigToSave);
    const sessionToSave: SessionStored = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      expires_at: data.session.expires_at,
      provider_refresh_token: data.session.provider_refresh_token,
      provider_token: data.session.provider_token,
    };
    const userConfigToSave: Tables["UserConfig"] = {
      userId: data.user.id,
      language: userConfig.data?.[0]?.language || "en",
      hasAdmin: userConfig.data?.[0]?.hasAdmin || false,
      updatedAt: new Date().toISOString(),
      webSocketURL: userConfig.data?.[0]?.webSocketURL || "",
      API_URL: userConfig.data?.[0]?.API_URL || "",
    };

    await Promise.all([
      saveData("@notifications", userNotificationsConfigToSave),
      saveDataSecure("_sessionExpiry", date),
      saveDataSecure("_selectedCryptos", cryptosToSave),
      insertTokenToDB(data.user.id),
      saveDataSecure("_userSessionStorage", sessionToSave),
      saveData("@API_URL", userConfigToSave.API_URL || ""),
      saveData("@webSocketURL", userConfigToSave.webSocketURL || ""),
      saveData("@hasAdminAccess", userConfigToSave.hasAdmin),
      saveData("@languageKeyStorage", userConfigToSave.language),
    ]);
    return {
      user: data.user,
      userData: users.data as UserData,
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
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error during sign up: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<{ error?: string | null }> => {
  try {
    await Promise.all([
      removeDataSecure("_sessionExpiry"),
      removeDataSecure("_userSessionStorage"),
    ]);
    const { error } = await supabase.auth.signOut();

    if (error) {
      logError("Error signing out:", error.message);
      return { error: error.message };
    }

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
export const getCurrentSession = async (): Promise<{
  session?: Session | null;
  error?: string | null;
  userData?: UserData | null;
  user?: User | null;
}> => {
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
    const [, { data: userData }] = await Promise.all([
      saveDataSecure("_userSessionStorage", { ...session, user: null }),
      supabase.from("Users").select("*").eq("uid", session?.user.id).single(),
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
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error refreshing session: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Gets user data from the Users table in Supabase
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
      .select("*")
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
 * Inserts a new record into a specified table
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

  const cryptos: Tables["Cryptos"][] = [];
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
      interval: -1,
      updatedAt: new Date().toISOString(),
      isActive: true,
    }));
  const userConfig: Tables["UserConfig"] = {
    userId,
    language: await checkLanguage(),
    hasAdmin: false,
    updatedAt: new Date().toISOString(),
  };

  const initialData: Record<
    TablesKeys,
    Tables[TablesKeys][] | Tables[TablesKeys]
  > = {
    Cryptos: cryptos,
    PushTokens: pushTokens,
    Users: user,
    Logs: [],
    UserNotificationsConfig: userNotificationsConfig,
    UserConfig: userConfig,
  };

  await Promise.all(
    Object.entries(initialData).map(([table, data]) => {
      insertIntoTable(table as TablesKeys, data);
    }),
  );
};
