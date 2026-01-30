import chalk from "chalk";
import { showError, showInfo } from "../functions/logger.ts";
import { WebSocket, WebSocketServer } from "ws";
import {
  fetchFromTable,
  insertIntoTable,
  updateInTable,
} from "../database/functions.ts";
import { ClipboardSync, ClipboardWebSocketMessage } from "@types";

type DataUser = {
  userId: string;
  deviceId: string;
  isClosing: boolean;
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

const handleClose = (data: DataUser, ws?: WebSocket) => {
  try {
    if (ws && ws.readyState !== WebSocket.CLOSED && !data.isClosing) {
      data.isClosing = true;
      ws.close();
      ws.removeAllListeners();
    }
  } catch {
    // Ignore
  }

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
                id: lastItem.id as string,
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
          showError(
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
        isClosing: false,
      };

      connectionClipboard.on("message", async (buffer) => {
        try {
          const message = JSON.parse(
            buffer.toString(),
          ) as ClipboardWebSocketMessage<"sentByApp">;

          switch (message.type) {
            case "init": {
              if (!message.userId || !message.deviceId) {
                handleClose(data, connectionClipboard);
                return;
              }
              data = {
                userId: message.userId,
                deviceId: message.deviceId,
                isClosing: false,
              };

              showInfo(
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
                    showInfo(
                      chalk.red("Terminating unresponsive clipboard client:"),
                      chalk.yellow(data.userId),
                      chalk.green("-"),
                      chalk.yellow(data.deviceId),
                    );
                    handleClose(data, connectionClipboard);
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

              const { data: existsData } = await fetchFromTable({
                table: "ClipboardSync",
                match: {
                  userId: data.userId,
                  deviceId: data.deviceId,
                  content: message.content,
                },
                limit: 1,
                orderBy: "createdAt",
                orderDirection: "DESC",
              });
              let id = existsData?.[0].id as string;

              if (id) {
                updateInTable(
                  "ClipboardSync",
                  {
                    createdAt: new Date().toISOString(),
                  },
                  {
                    id,
                  },
                );
              } else {
                const { data: insertedData } = await insertIntoTable(
                  "ClipboardSync",
                  value,
                );
                if (!insertedData || !insertedData.length) break;
                id = insertedData[0].id as string;
              }

              const devices = usersClipboard[data.userId] || {};
              devices[data.deviceId].lastContent = message.content;

              Object.entries(devices).forEach(([deviceId, device]) => {
                try {
                  if (device.lastContent === message.content) return;
                  if (device.ws.readyState !== WebSocket.OPEN) {
                    deleteDevice({ userId: data.userId, deviceId });
                    return;
                  }
                  const msg: ClipboardWebSocketMessage<"sentByServer"> = {
                    id,
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
              showInfo(
                chalk.yellow("Unknown clipboard message type:"),
                message,
              );
              break;
          }
        } catch (error) {
          showError(
            chalk.red("Error handling Clipboard WebSocket message:"),
            error,
          );
        }
      });

      connectionClipboard.on("close", () => {
        showInfo(
          chalk.red("Clipboard client disconnected:"),
          chalk.yellow(data.userId),
          chalk.green("Device ID:"),
          chalk.yellow(data.deviceId),
        );
      });

      connectionClipboard.on("error", (error) => {
        showInfo(
          "Clipboard WebSocket error:",
          error instanceof Error ? error.message : error,
        );
        handleClose(data, connectionClipboard);
      });
    });

    return wss;
  } catch (error) {
    showError(
      chalk.red("Error initializing Clipboard WebSocket server:"),
      error,
    );
    throw error;
  }
};
