import { showError } from "../functions/logger.ts";
import { RequestLogs } from "@types";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { insertIntoTable } from "../database/functions.ts";
import { sendFCMNotification } from "firebase/admin.ts";

/**
 * Handles adding a log entry to the database.
 * @param req - The request object containing the log entry.
 * @param res - The response object indicating success or failure.
 */
export const handleAddLog = getHandlerPost(
  "/log",
  {},
  async (body, sendResponse) => {
    let success = false;
    let error: string | undefined;

    try {
      const log = (body || null) as RequestLogs | null;
      if (log) {
        const { error: insertError } = await insertIntoTable("Logs", log);
        error = insertError || undefined;
        success = !error;
      }
    } catch (err) {
      showError("Error adding log:", err);
      error = err instanceof Error ? err.message : String(err);
    }
    sendResponse("SUCCESS", { success });
  },
);

const timers: {
  [deviceId: string]: {
    pushToken: string;
    idTimeout: number | null;
  };
} = {};

export const handleAppAliveCheck = getHandlerPost(
  "/debug/appAlive",
  {
    deviceId: "string",
    pushToken: "string",
  },
  async (body, sendResponse) => {
    const { deviceId, pushToken } = body;

    if (timers[deviceId]?.idTimeout) clearTimeout(timers[deviceId].idTimeout);

    timers[deviceId] = {
      pushToken,
      idTimeout: setTimeout(
        () => {
          sendFCMNotification(
            [pushToken],
            {
              title: "App not alive",
              body: "The app on your device has not been alive for the last 5 minutes.",
            },
            "default",
            { screen: "Settings" },
          );
          delete timers[deviceId];
        },
        5 * 60 * 1000,
      ),
    };

    sendResponse("SUCCESS", {
      success: true,
      timestamp: new Date().toISOString(),
    });
  },
);
