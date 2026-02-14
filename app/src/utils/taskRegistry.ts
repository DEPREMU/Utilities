import {
  AvailableFunctions,
  RequestDatabaseDelete,
  RequestDatabaseUpdate,
} from "@types";
import { storageManagement } from "./services";
import { logger, fetchToServer } from "./functions";
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
      const [lang, token, deviceId] = [
        storageManagement.get("LANGUAGE"),
        storageManagement.get("USER_SESSION_TOKEN_STORAGE"),
        storageManagement.get("DEVICE_ID"),
      ];
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
      logger.error(`Error updating ${table}:`, error);
    }
  },

  insertIntoDatabase: async <T extends TablesKeys>(
    table: T,
    values: RequestDatabaseInsert<T>["values"],
  ) => {
    try {
      const [lang, token, deviceId] = [
        storageManagement.get("LANGUAGE"),
        storageManagement.get("USER_SESSION_TOKEN_STORAGE"),
        storageManagement.get("DEVICE_ID"),
      ];
      if (!token) return;

      const body: RequestDatabaseInsert<T> = {
        lang,
        table,
        values,
        deviceId,
      };

      await fetchToServer("/database/insert", body as never, token);
    } catch (error) {
      logger.error(`Error inserting into ${table}:`, error);
    }
  },

  deleteFromDatabase: async <T extends TablesKeys>(
    table: T,
    match: RequestDatabaseDelete<T>["match"],
  ) => {
    try {
      const [lang, token, deviceId] = [
        storageManagement.get("LANGUAGE"),
        storageManagement.get("USER_SESSION_TOKEN_STORAGE"),
        storageManagement.get("DEVICE_ID"),
      ];
      if (!token) return;

      const body: RequestDatabaseDelete<T> = {
        lang,
        table,
        match,
        deviceId,
      };

      await fetchToServer("/database/delete", body as never, token);
    } catch (error) {
      logger.error(`Error deleting from ${table}:`, error);
    }
  },
};

export const getTaskRegistry = (): TaskRegistry => taskRegistry;

export const executeRegisteredTask = async (
  functionName: AvailableFunctions,
  args: unknown[],
): Promise<void> => {
  if (functionName === "refreshSession") {
    logger.error(
      "refreshSession should not be executed via executeRegisteredTask",
    );
    return;
  }

  const taskFunction = taskRegistry[functionName];

  if (!taskFunction) {
    logger.error(`Task function ${functionName} not found in registry`);
    return;
  }

  try {
    await taskFunction(...(args || []));
  } catch (error) {
    logger.error(`Error executing task ${functionName}:`, error);
  }
};
