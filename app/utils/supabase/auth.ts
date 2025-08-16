import {
  log,
  logError,
  saveDataSecure,
  loadDataSecure,
  getDateWithDaysAhead,
  removeDataSecure,
} from "../functions";
import { SessionStored } from "@types";
import { navigateReplace } from "@navigation/navigationRef";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";
import { TablesKeys, UserData } from "@types";

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
    await saveDataSecure("_sessionExpiry", date);

    const { data: userData } = await supabase
      .from("Users")
      .select("*")
      .eq("uid", data.user.id)
      .single();

    if (!data.session || !data.user) {
      const errorMsg = "No session or user data received from Supabase";
      logError(errorMsg);
      return { error: errorMsg };
    }

    log("User signed in successfully:", data.user.email);
    const sessionToSave: SessionStored = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      expires_at: data.session.expires_at,
      provider_refresh_token: data.session.provider_refresh_token,
      provider_token: data.session.provider_token,
    };
    await saveDataSecure("_userSessionStorage", sessionToSave);
    return {
      user: data.user,
      userData: userData as UserData,
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

    log("User signed up successfully:", data.user?.email);
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

    log("User record created successfully:");
    return {
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error creating record: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Updates user data in the Users table
 */
export const updateInTable = async (
  uid: string,
  updates: Partial<UserData>,
  table: TablesKeys = "Users",
  match: { [key: string]: unknown } = { uid },
): Promise<{
  userData?: UserData | null;
  error?: string | null;
}> => {
  try {
    if (updates.uid) delete updates.uid;

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .match(match)
      .select()
      .single();

    if (error) {
      logError("Error updating user record:", error.message);
      return { error: error.message };
    }

    log("User record updated successfully:", uid);
    return {
      userData: data,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error updating user record: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};

/**
 * Deletes a record from a specified table
 */
export const deleteInTable = async <T = UserData>(
  uid: string,
  table: TablesKeys = "Users",
  match: Partial<T> = {},
): Promise<{
  success: boolean;
  error?: string | null;
}> => {
  try {
    const { error } = await supabase.from(table).delete().match(match);

    if (error) {
      logError("Error deleting user record:", error.message);
      return { success: false, error: error.message };
    }

    log("User record deleted successfully:", uid);
    return { success: true };
  } catch (error) {
    const errorMsg = `Unexpected error deleting user record: ${error}`;
    logError(errorMsg);
    return { success: false, error: errorMsg };
  }
};

export const fetchFromTable = async <T>(
  table: TablesKeys = "Users",
  match: Partial<T> = {},
): Promise<{
  data?: T[] | null;
  error?: string | null;
}> => {
  try {
    const { data, error } = await supabase.from(table).select().match(match);

    if (error) {
      logError("Error fetching data from table:", error.message);
      return { error: error.message };
    }

    log("Data fetched successfully from table:", table);
    return {
      data,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error fetching data from table: ${error}`;
    logError(errorMsg);
    return { error: errorMsg };
  }
};
