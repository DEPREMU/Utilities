import { SelectedCryptos } from "../constants";
import { log, logError } from "../functions";
import { supabase } from "./supabase";
import { Cryptos, Tables, TablesKeys, UserData } from "@types";

export const getCryptosFromSupabase = async (userId: string) => {
  const { data: cryptosFromSupabase } = await fetchFromTable<Cryptos>(
    "Cryptos",
    { userId },
  );
  if (!cryptosFromSupabase) return {};
  const newOwned: SelectedCryptos = cryptosFromSupabase.reduce(
    (acc, crypto) => {
      acc[[crypto.id, crypto.currency].join("")] = crypto;
      return acc;
    },
    {} as SelectedCryptos,
  );

  return newOwned;
};

/**
 * Updates user data in the Users table
 */
export const updateInTable = async (
  table: TablesKeys = "Users",
  updates: Partial<Tables[TablesKeys]> | Partial<Tables[TablesKeys]>[],
  match?: { [key: string]: unknown },
): Promise<{
  error?: string | null;
}> => {
  try {
    const getMatchObject = (
      update: Partial<Tables[TablesKeys]>,
      match?: { [key: string]: unknown },
    ) => {
      if (match && Object.keys(match).length > 0) return match;

      return Object.keys(update).includes("id")
        ? { id: update["id" as keyof Tables[TablesKeys]] }
        : { uid: update["uid" as keyof Tables[TablesKeys]] };
    };

    if (Array.isArray(updates)) {
      const updatePromises = updates.map((update) =>
        supabase
          .from(table)
          .update(update)
          .match(getMatchObject(update, match)),
      );
      const results = await Promise.all(updatePromises);
      const errors = results
        .map((result) => result.error)
        .filter((error) => error !== null);
      if (errors.length > 0) {
        const errorMessages = errors.map((err) => err?.message).join(", ");
        logError("Error updating user records:", errorMessages);
        return { error: errorMessages };
      }
      log("User records updated successfully:", updates);
      return { error: null };
    }

    const { error } = await supabase
      .from(table)
      .update(updates)
      .match(getMatchObject(updates, match));

    if (error) {
      logError("Error updating user record:", error.message);
      return { error: error.message };
    }

    log("User record updated successfully:", updates);
    return {
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

/**
 * Fetches data from a specified table
 */
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
