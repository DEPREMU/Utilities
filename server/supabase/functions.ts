import chalk from "chalk";
import { supabase } from "./supabase.ts";
import type { Falsy } from "../../app/node_modules/react-native/";
import type { Tables, TablesKeys } from "../../types";

/**
 * Updates user data in the Users table
 */
export const updateInTable = async <T extends TablesKeys>(
  table: T = "Users" as T,
  updates: Partial<Tables[T]> | Partial<Tables[T]>[],
  match?: Partial<Tables[T]>,
): Promise<{
  data?: Tables[T][] | Tables[T] | Falsy;
  error?: string | null;
}> => {
  try {
    const getMatchObject = (
      update: Partial<Tables[T]>,
      match?: { [key: string]: unknown },
    ) => {
      if (match && Object.keys(match).length > 0) return match;

      return Object.keys(update).includes("id")
        ? { id: update["id" as keyof Tables[TablesKeys]] }
        : { userId: update["userId" as keyof Tables[TablesKeys]] };
    };

    if (Array.isArray(updates)) {
      const updatePromises = updates.map((update) =>
        supabase
          .from(table)
          .update(Array.isArray(update) ? update[0] : update)
          .match(getMatchObject(update, match))
          .select()
          .single(),
      );
      const results = await Promise.all(updatePromises);
      const errors = results
        .map((result) => result.error)
        .filter((error) => error !== null);
      if (errors.length > 0) {
        const errorMessages = errors.map((err) => err?.message).join(", ");
        console.error(chalk.red("Error updating user records:"), errorMessages);
        return { error: errorMessages };
      }
      return {
        data: results.map((result) => result.data as Tables[T]),
        error: null,
      };
    }

    const { error, data } = await supabase
      .from(table)
      .update(updates)
      .match(getMatchObject(updates, match))
      .select()
      .single();

    if (error) {
      console.error(chalk.red("Error updating user record:"), error);
      return { error: error.message };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error updating user record: ${error}`;
    console.error(chalk.red(errorMsg));
    return { error: errorMsg };
  }
};

/**
 * Deletes a record from a specified table
 */
export const deleteInTable = async <T extends TablesKeys = "Users">(
  userId: string,
  table: T = "Users" as T,
  match?: Partial<Tables[T]>,
): Promise<{
  success: boolean;
  error?: string | null;
}> => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .match(match ?? { userId });

    if (error) {
      console.error(chalk.red("Error deleting user record:"), error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMsg = `Unexpected error deleting user record: ${error}`;
    console.error(chalk.red(errorMsg));
    return { success: false, error: errorMsg };
  }
};

/**
 * Fetches data from a specified table
 */
export const fetchFromTable = async <T extends TablesKeys = TablesKeys>(
  table: T = "Users" as T,
  match: Partial<Tables[T]> = {},
): Promise<{
  data?: Tables[T][] | Tables[T] | null;
  error?: string | null;
}> => {
  try {
    const { data, error } = await supabase.from(table).select().match(match);

    if (error) {
      console.error(
        chalk.red("Error fetching data from table:"),
        error.message,
      );
      return { error: error.message };
    }

    if (data.length === 1) {
      return data[0]
        ? { data: data[0], error: null }
        : { data: null, error: null };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error fetching data from table: ${error}`;
    console.error(chalk.red(errorMsg));
    return { error: errorMsg };
  }
};

/**
 * Inserts data into a specified table
 */
export const insertIntoTable = async <T extends TablesKeys = TablesKeys>(
  table: T = "Users" as T,
  data: Partial<Tables[T]> | Partial<Tables[T]>[],
): Promise<{
  data?: Tables[T][] | Tables[T] | null;
  error?: string | null;
}> => {
  try {
    if (Array.isArray(data)) {
      const insertPromises = data.map((item) =>
        supabase.from(table).insert(item).select().single(),
      );
      const results = await Promise.all(insertPromises);
      const errors = results
        .map((result) => result.error)
        .filter((error) => error !== null);
      if (errors.length > 0) {
        const errorMessages = errors.map((err) => err?.message).join(", ");
        console.error(
          chalk.red("Error inserting user records:"),
          errorMessages,
        );
        return { error: errorMessages };
      }
      return {
        data: results.map((result) => result.data as Tables[T]),
        error: null,
      };
    }

    const { error, data: insertedData } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(chalk.red("Error inserting user record:"), error.message);
      return { error: error.message };
    }

    return {
      data: insertedData,
      error: null,
    };
  } catch (error) {
    const errorMsg = `Unexpected error inserting user record: ${error}`;
    console.error(chalk.red(errorMsg));
    return { error: errorMsg };
  }
};
