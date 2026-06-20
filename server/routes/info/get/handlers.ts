import { sendFCMNotification } from "@/firebase/admin";
import { getHandlerGet } from "@/functions/getHandlerGet";
import { Logger, Timers } from "@common";
import humanizeDuration from "humanize-duration";

const START_TIME = Date.now();

export const handleHealthCheck = getHandlerGet(
  "/info",
  "/health",
  {},
  (_, sendRes) => {
    const now = new Date();
    const upTime = now.getTime() - START_TIME;

    sendRes("SUCCESS", { upTime, timestamp: now.toISOString() });
  },
);

export const handleGenerate204 = getHandlerGet(
  "/info",
  "/generate204",
  {},
  (_, sendRes) => {
    sendRes("NO_CONTENT", undefined);
  },
);

const timers: {
  [deviceId: string]: {
    pushToken: string;
    idTimeout: number | null;
    lastTimestamp: number;
  };
} = {};

export const handleAppAlive = getHandlerGet(
  "/info",
  "/appAlive/:deviceId-string/:pushToken-string",
  {
    deviceId: "string",
    pushToken: "string",
  },
  async (params, sendResponse) => {
    try {
      const { deviceId, pushToken } = params;

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

      sendResponse("SUCCESS", { success: true });
    } catch (error) {
      Logger.error("Error in handleAppAlive:", error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "An error occurred while processing the request.",
      });
    }
  },
);
