import humanizeDuration from "humanize-duration";
import { sendFCMNotification } from "@/firebase/admin";
import { Logger, STATUS_RESPONSE, Timers, getHandlerGet } from "@common";

const START_TIME = Date.now();

export const handleHealthCheck = getHandlerGet(
  "/info",
  "/health",
  (_, sendRes) => {
    const now = new Date();
    const uptime = now.getTime() - START_TIME;

    sendRes(STATUS_RESPONSE.SUCCESS, {
      uptime,
      timestamp: now.toISOString(),
      status: "running",
      uptimeString: humanizeDuration(uptime, {
        largest: 2,
        units: ["d", "h", "m", "s"],
      }),
    });
  },
);

export const handleGenerate204 = getHandlerGet(
  "/info",
  "/generate204",
  (_, sendRes) => {
    sendRes(STATUS_RESPONSE.NO_CONTENT, "");
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
  "/appAlive/:deviceId/:pushToken",
  async ({ params }, sendResponse) => {
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

      sendResponse(STATUS_RESPONSE.SUCCESS, { success: true });
    } catch (error) {
      Logger.error("Error in handleAppAlive:", error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: "An error occurred while processing the request.",
      });
    }
  },
);
