import {
  logError,
  getRouteAPI,
  fetchOptions,
  checkLanguage,
  loadDataSecure,
} from "@utils";
import {
  Tables,
  TablesKeys,
  RequestSupabaseUpdate,
  RequestSupabaseDelete,
  RequestSupabaseInsert,
} from "@types";

type TaskFunction = Function;

export type AvailableFunctions =
  | "insertIntoSupabase"
  | "updateFromSupabase"
  | "deleteFromSupabase";

type TaskRegistry = Record<AvailableFunctions, TaskFunction>;

export type FunctionsArguments<T extends AvailableFunctions> =
  T extends "insertIntoSupabase"
    ? [table: TablesKeys, values: Tables[TablesKeys] | Tables[TablesKeys][]]
    : T extends "updateFromSupabase"
      ? [
          table: TablesKeys,
          values: Partial<Tables[TablesKeys]> | Partial<Tables[TablesKeys]>[],
          match: Partial<Tables[TablesKeys]> | null,
        ]
      : T extends "deleteFromSupabase"
        ? [table: TablesKeys, match: Partial<Tables[TablesKeys]> | null]
        : never;

export interface SerializableTask {
  id: string;
  functionName: AvailableFunctions;
  args: unknown[];
  timestamp: number;
}

const taskRegistry: TaskRegistry = {
  updateFromSupabase: async <T extends TablesKeys>(
    tableName: T,
    data: Partial<Tables[T]> | Partial<Tables[T]>[],
    condition: Partial<Tables[T]> | null,
  ) => {
    try {
      const [lang, token] = await Promise.all([
        checkLanguage(),
        loadDataSecure("_userSessionTokenStorage"),
      ]);
      if (!token) return;

      await fetch(
        await getRouteAPI("/supabase/update"),
        fetchOptions<RequestSupabaseUpdate>(
          "POST",
          {
            table: tableName,
            values: data,
            match: condition,
            lang,
          },
          token,
        ),
      );
    } catch (error) {
      logError(`Error updating ${tableName}:`, error);
    }
  },

  insertIntoSupabase: async <T extends TablesKeys>(
    table: T,
    values: Tables[T] | Tables[T][],
  ) => {
    try {
      const [lang, token] = await Promise.all([
        checkLanguage(),
        loadDataSecure("_userSessionTokenStorage"),
      ]);
      if (!token) return;
      await fetch(
        await getRouteAPI("/supabase/insert"),
        fetchOptions<RequestSupabaseInsert>(
          "POST",
          {
            table,
            values,
            lang,
          },
          token,
        ),
      );
    } catch (error) {
      logError(`Error inserting into ${table}:`, error);
    }
  },

  deleteFromSupabase: async <T extends TablesKeys>(
    table: T,
    match: Partial<Tables[T]>,
  ) => {
    try {
      const [lang, token] = await Promise.all([
        checkLanguage(),
        loadDataSecure("_userSessionTokenStorage"),
      ]);
      if (!token) return;

      await fetch(
        await getRouteAPI("/supabase/delete"),
        fetchOptions<RequestSupabaseDelete>(
          "POST",
          {
            table,
            match,
            lang,
          },
          token,
        ),
      );
    } catch (error) {
      logError(`Error deleting from ${table}:`, error);
    }
  },
};

export const getTaskRegistry = (): TaskRegistry => taskRegistry;

export const executeRegisteredTask = async (
  functionName: AvailableFunctions,
  args: unknown[],
): Promise<void> => {
  const taskFunction = taskRegistry[functionName];

  if (!taskFunction) {
    logError(`Task function ${functionName} not found in registry`);
    return;
  }

  try {
    await taskFunction(...(args || []));
  } catch (error) {
    logError(`Error executing task ${functionName}:`, error);
  }
};
