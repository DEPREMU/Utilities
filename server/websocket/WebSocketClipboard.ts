import chalk from "chalk";
import { fetchFromTable, insertIntoTable } from "../database/functions.ts";
import { ClipboardSync, ClipboardWebSocketMessage } from "@types";
import { WebSocket, WebSocketServer } from "ws";

type DataUser = {
  userId: string;
  deviceId: string;
};

let idIntervalClipboard: NodeJS.Timeout | number | null = null;

const usersClipboard: {
  [userId: string]: {
    [deviceId: string]: {
      ws: WebSocket;
      lastContent: string | null;
      pingTimeoutId: NodeJS.Timeout | number | null;
      pingIntervalId: NodeJS.Timeout | number | null;
    };
  };
} = {};

const deleteDevice = (data: { userId: string; deviceId: string }) => {
  if (!usersClipboard[data.userId]) return;

  delete usersClipboard[data.userId]?.[data.deviceId];
  if (Object.keys(usersClipboard[data.userId]).length > 0) return;

  delete usersClipboard[data.userId];
};

const handleClose = (data: DataUser) => {
  if (!usersClipboard[data.userId]) return;

  const pingIntervalId =
    usersClipboard[data.userId][data.deviceId]?.pingIntervalId;
  if (pingIntervalId) clearInterval(pingIntervalId);

  const pingTimeoutId =
    usersClipboard[data.userId][data.deviceId]?.pingTimeoutId;
  if (pingTimeoutId) clearTimeout(pingTimeoutId);

  deleteDevice(data);
};

export const initWebSocketClipboard = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    if (idIntervalClipboard) clearInterval(idIntervalClipboard);
    idIntervalClipboard = setInterval(() => {
      const users = Object.entries(usersClipboard || {});

      users?.forEach(async ([userId, devices]) => {
        try {
          const fetchedData = await fetchFromTable({
            limit: 1,
            table: "ClipboardSync",
            match: { userId, deleted: false },
            orderBy: "createdAt",
            orderDirection: "DESC",
          });
          const dataLang = fetchedData?.data;
          if (!dataLang || dataLang.length === 0) return;

          const lastItem: ClipboardSync = dataLang[0];

          if (!lastItem) return;

          Object.entries(devices).forEach(([deviceId, device]) => {
            try {
              if (device.lastContent === lastItem.content) return;
              if (device.ws.readyState !== WebSocket.OPEN) {
                deleteDevice({ userId, deviceId });
                return;
              }
              const message: ClipboardWebSocketMessage<"sentByServer"> = {
                type: "new-clipboard-item",
                content: lastItem.content,
              };
              device.ws.send(JSON.stringify(message));
              usersClipboard[userId][deviceId].lastContent = lastItem.content;
            } catch {
              // Ignore
            }
          });
        } catch (error) {
          console.error(
            chalk.red("Error sending clipboard data via WebSocket:"),
            error,
          );
        }
      });
    }, 1000);

    wss.on("connection", (connectionClipboard) => {
      let data: DataUser = {
        userId: "",
        deviceId: "",
      };

      connectionClipboard.on("message", async (buffer) => {
        try {
          const message = JSON.parse(
            buffer.toString(),
          ) as ClipboardWebSocketMessage<"sentByApp">;

          switch (message.type) {
            case "init": {
              if (!message.userId || !message.deviceId) {
                connectionClipboard.close?.();
                return;
              }
              data = { userId: message.userId, deviceId: message.deviceId };

              console.log(
                chalk.green("New clipboard client connected:"),
                chalk.yellow(data.userId),
                chalk.green("Device ID:"),
                chalk.yellow(data.deviceId),
              );

              const pingIntervalId = setInterval(() => {
                if (!usersClipboard[data.userId]) return;
                if (!usersClipboard[data.userId][data.deviceId]) return;

                usersClipboard[data.userId][data.deviceId].pingTimeoutId =
                  setTimeout(() => {
                    console.log(
                      chalk.red("Terminating unresponsive clipboard client:"),
                      chalk.yellow(data.userId),
                      chalk.green("-"),
                      chalk.yellow(data.deviceId),
                    );
                    connectionClipboard.close();
                  }, 10000);
                connectionClipboard.send(JSON.stringify({ type: "ping" }));
              }, 29000);

              usersClipboard[data.userId] = {
                ...usersClipboard[data.userId],
                [data.deviceId]: {
                  ws: connectionClipboard,
                  lastContent: null,
                  pingTimeoutId: null,
                  pingIntervalId,
                },
              };
              break;
            }
            case "add-new-item": {
              const value: ClipboardSync = {
                userId: data.userId,
                deleted: false,
                content: message.content,
                deviceId: data.deviceId,
                createdAt: new Date().toISOString(),
              };

              insertIntoTable("ClipboardSync", value);

              const devices = usersClipboard[data.userId];
              devices[data.deviceId].lastContent = message.content;

              Object.entries(devices || {}).forEach(([deviceId, device]) => {
                try {
                  if (deviceId === data.deviceId) return;
                  if (device.lastContent === message.content) return;
                  if (device.ws.readyState !== WebSocket.OPEN) {
                    deleteDevice({ userId: data.userId, deviceId });
                    return;
                  }
                  const msg: ClipboardWebSocketMessage<"sentByServer"> = {
                    type: "new-clipboard-item",
                    content: message.content,
                  };
                  device.ws.send(JSON.stringify(msg));
                } catch {
                  // Ignore
                }
              });
              break;
            }
            case "pong": {
              if (!usersClipboard[data.userId]) break;
              if (!usersClipboard[data.userId][data.deviceId]) break;

              const timeoutId =
                usersClipboard[data.userId][data.deviceId].pingTimeoutId;
              if (timeoutId) clearTimeout(timeoutId);

              usersClipboard[data.userId][data.deviceId].pingTimeoutId = null;
              break;
            }
            default:
              console.log(
                chalk.yellow("Unknown clipboard message type:"),
                message,
              );
              break;
          }
        } catch (error) {
          console.error(
            chalk.red("Error handling Clipboard WebSocket message:"),
            error,
          );
        }
      });

      connectionClipboard.on("close", () => {
        console.log(
          chalk.red("Clipboard client disconnected:"),
          chalk.yellow(data.userId),
          chalk.green("Device ID:"),
          chalk.yellow(data.deviceId),
        );
        handleClose(data);
        connectionClipboard.removeAllListeners();
      });

      connectionClipboard.on("error", (error) => {
        console.log("Clipboard WebSocket error:", error);
        connectionClipboard.close();
      });
    });

    return wss;
  } catch (error) {
    console.error(
      chalk.red("Error initializing Clipboard WebSocket server:"),
      error,
    );
    throw error;
  }
};
