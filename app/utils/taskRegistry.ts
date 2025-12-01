import { AvailableFunctions } from "@types";
import { Tables, TablesKeys, RequestDatabaseInsert } from "@types";
import { logError, checkLanguage, loadDataSecure, fetchToServer } from "@utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TaskFunction = (...args: any[]) => Promise<void> | void;

type TaskRegistry = Record<
  Exclude<AvailableFunctions, "refreshSession">,
  TaskFunction
>;

const taskRegistry: TaskRegistry = {
  updateFromDatabase: async <T extends TablesKeys>(
    tableName: T,
    data: Partial<Tables[T]> | Partial<Tables[T]>[],
    condition: Partial<Tables[T]> | null,
  ) => {
    try {
      const [lang, token, deviceId] = await Promise.all([
        checkLanguage(),
        loadDataSecure("_userSessionTokenStorage"),
        loadDataSecure("_deviceId"),
      ]);
      if (!token) return;

      fetchToServer(
        "/database/update",
        {
          table: tableName,
          values: data,
          match: condition,
          lang,
          deviceId: deviceId || "local-device",
        },
        token,
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
      const [lang, token, deviceId] = await Promise.all([
        checkLanguage(),
        loadDataSecure("_userSessionTokenStorage"),
        loadDataSecure("_deviceId"),
      ]);
      if (!token) return;
      await fetchToServer(
        "/database/insert",
        {
          table,
          values,
          deviceId: deviceId || "local-device",
          lang,
        },
        token,
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
      const [lang, token, deviceId] = await Promise.all([
        checkLanguage(),
        loadDataSecure("_userSessionTokenStorage"),
        loadDataSecure("_deviceId"),
      ]);
      if (!token) return;

      await fetchToServer(
        "/database/delete",
        {
          table,
          match,
          deviceId: deviceId || "local-device",
          lang,
        },
        token,
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
