/* eslint-disable @stylistic/indent */
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
  RequestDatabaseUpdate,
  RequestDatabaseDelete,
  RequestDatabaseInsert,
} from "@types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskFunction = (...args: any[]) => Promise<void> | void;

export type AvailableFunctions =
  | "insertIntoDatabase"
  | "updateFromDatabase"
  | "deleteFromDatabase";

type TaskRegistry = Record<AvailableFunctions, TaskFunction>;

export type FunctionsArguments<T extends AvailableFunctions> =
  T extends "insertIntoDatabase"
    ? [table: TablesKeys, values: Tables[TablesKeys] | Tables[TablesKeys][]]
    : T extends "updateFromDatabase"
      ? [
          table: TablesKeys,
          values: Partial<Tables[TablesKeys]> | Partial<Tables[TablesKeys]>[],
          match: Partial<Tables[TablesKeys]> | null,
        ]
      : T extends "deleteFromDatabase"
        ? [table: TablesKeys, match: Partial<Tables[TablesKeys]> | null]
        : never;

export interface SerializableTask {
  id: string;
  functionName: AvailableFunctions;
  args: unknown[];
  timestamp: number;
}

const taskRegistry: TaskRegistry = {
  updateFromDatabase: async <T extends TablesKeys>(
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
        await getRouteAPI("/database/update"),
        fetchOptions<RequestDatabaseUpdate<typeof tableName>>(
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

  insertIntoDatabase: async <T extends TablesKeys>(
    table: T,
    values: RequestDatabaseInsert["values"],
  ) => {
    try {
      const [lang, token] = await Promise.all([
        checkLanguage(),
        loadDataSecure("_userSessionTokenStorage"),
      ]);
      if (!token) return;
      await fetch(
        await getRouteAPI("/database/insert"),
        fetchOptions<RequestDatabaseInsert>(
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

  deleteFromDatabase: async <T extends TablesKeys>(
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
        await getRouteAPI("/database/delete"),
        fetchOptions<RequestDatabaseDelete>(
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
