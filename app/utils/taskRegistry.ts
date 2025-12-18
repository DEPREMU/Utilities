import {
  AvailableFunctions,
  RequestDatabaseDelete,
  RequestDatabaseUpdate,
} from "@types";
import {
  logError,
  checkLanguage,
  fetchToServer,
  loadDataStorage,
} from "@utils";
import { TablesKeys, RequestDatabaseInsert } from "@types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskFunction = (...args: any[]) => Promise<void> | void;

type TaskRegistry = Record<
  Exclude<AvailableFunctions, "refreshSession">,
  TaskFunction
>;

const taskRegistry: TaskRegistry = {
  updateFromDatabase: async <T extends TablesKeys>(
    table: T,
    values: RequestDatabaseUpdate<T>["values"],
    match: RequestDatabaseUpdate<T>["match"],
  ) => {
    try {
      const [lang, token, deviceId] = await Promise.all([
        checkLanguage(),
        loadDataStorage("USER_SESSION_TOKEN_STORAGE"),
        loadDataStorage("DEVICE_ID"),
      ]);
      if (!token) return;

      const body: RequestDatabaseUpdate<T> = {
        lang,
        table,
        match,
        values,
        deviceId,
      };

      await fetchToServer("/database/update", body as never, token);
    } catch (error) {
      logError(`Error updating ${table}:`, error);
    }
  },

  insertIntoDatabase: async <T extends TablesKeys>(
    table: T,
    values: RequestDatabaseInsert<T>["values"],
  ) => {
    try {
      const [lang, token, deviceId] = await Promise.all([
        checkLanguage(),
        loadDataStorage("USER_SESSION_TOKEN_STORAGE"),
        loadDataStorage("DEVICE_ID"),
      ]);
      if (!token) return;

      const body: RequestDatabaseInsert<T> = {
        lang,
        table,
        values,
        deviceId,
      };

      await fetchToServer("/database/insert", body as never, token);
    } catch (error) {
      logError(`Error inserting into ${table}:`, error);
    }
  },

  deleteFromDatabase: async <T extends TablesKeys>(
    table: T,
    match: RequestDatabaseDelete<T>["match"],
  ) => {
    try {
      const [lang, token, deviceId] = await Promise.all([
        checkLanguage(),
        loadDataStorage("USER_SESSION_TOKEN_STORAGE"),
        loadDataStorage("DEVICE_ID"),
      ]);
      if (!token) return;

      const body: RequestDatabaseDelete<T> = {
        lang,
        table,
        match,
        deviceId,
      };

      await fetchToServer("/database/delete", body as never, token);
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
  if (functionName === "refreshSession") {
    logError("refreshSession should not be executed via executeRegisteredTask");
    return;
  }

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
