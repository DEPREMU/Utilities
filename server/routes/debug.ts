import humanizeDuration from "humanize-duration";
import { Logger, Timers } from "@common";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { sendFCMNotification } from "../firebase/admin.ts";
import { prisma } from "@/database/postgres.ts";

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
      const log: typeof body | null = body || null;
      if (log) {
        const insertedLog = await prisma.logs.create({
          data: { ...log, timestamp: new Date() },
        });
        success = !!insertedLog;
      }
    } catch (err) {
      Logger.error("Error adding log:", err);
      error = err instanceof Error ? err.message : String(err);
    }
    sendResponse("SUCCESS", { success, error });
  },
);

const timers: {
  [deviceId: string]: {
    pushToken: string;
    idTimeout: number | null;
    lastTimestamp: number;
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

    if (timers[deviceId]?.idTimeout)
      Timers.clearTimeout(timers[deviceId].idTimeout);
    else if (timers[deviceId]?.lastTimestamp) {
      sendFCMNotification(
        [pushToken],
        {
          title: "App alive",
          body: `The app on your device is alive after: ${humanizeDuration(
            Date.now() - timers[deviceId].lastTimestamp,
            { largest: 2, units: ["d", "h", "m", "s"] },
          )} of being not alive.`,
        },
        "default",
        { screen: "Settings" },
      );
    }

    timers[deviceId] = {
      pushToken,
      lastTimestamp: Date.now(),
      idTimeout: Timers.setTimeout(
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
          timers[deviceId].idTimeout = null;
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
