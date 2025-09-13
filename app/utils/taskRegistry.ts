import { logError, updateInTable } from "@utils";
import { Tables, TablesKeys } from "@types";

type TaskFunction = Function;

export type AvailableFunctions =
  | "updateAPIConfig"
  | "updateUserConfig"
  | "updateWebSocketConfig";

type TaskRegistry = Record<AvailableFunctions, TaskFunction>;

const taskRegistry: TaskRegistry = {
  updateUserConfig: async (
    tableName: TablesKeys,
    data: Partial<Tables[TablesKeys]>,
    condition: { [key: string]: unknown },
  ) => {
    try {
      await updateInTable(tableName, data, condition);
    } catch (error) {
      logError(`Error updating ${tableName}:`, error);
    }
  },

  updateWebSocketConfig: async (userId: string, webSocketURL: string) => {
    try {
      await updateInTable("UserConfig", { webSocketURL }, { userId });
    } catch (error) {
      logError("Error updating WebSocket config:", error);
    }
  },

  updateAPIConfig: async (userId: string, apiURL: string) => {
    try {
      await updateInTable("UserConfig", { API_URL: apiURL }, { userId });
    } catch (error) {
      logError("Error updating API config:", error);
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
