import {
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import chalk from "chalk";
import { Users } from "./WebSocketHandling.ts";
import { showError, showInfo } from "../functions/logger.ts";
import { WebSocket, WebSocketServer } from "ws";
import { ClipboardSync, ClipboardWebSocketMessage } from "@types";

let idIntervalClipboard: NodeJS.Timeout | number | null = null;

const usersClipboard = new Users<
  Record<string, unknown>,
  ClipboardWebSocketMessage<"sentByServer">,
  { lastItem: string }
>();

const handleInit = (
  message: ClipboardWebSocketMessage<"sentByApp">,
  userDevice: NonNullable<ReturnType<typeof usersClipboard.getUser>>,
) => {
  if (message.type !== "init") return;

  if (!message.userId || !message.deviceId) {
    userDevice.handleClose(1000, "Invalid init data");
    return;
  }
  userDevice.setUserData({
    userId: message.userId,
    deviceId: message.deviceId,
  });
  usersClipboard.addDeviceUser(userDevice);

  showInfo(
    chalk.green("New clipboard client connected:"),
    chalk.yellow(userDevice.userId),
    chalk.green("Device ID:"),
    chalk.yellow(userDevice.deviceId),
  );
};

const handleAddNewItem = async (
  message: ClipboardWebSocketMessage<"sentByApp">,
  userDevice: NonNullable<ReturnType<typeof usersClipboard.getUser>>,
) => {
  if (message.type !== "add-new-item") return;

  try {
    const value: ClipboardSync = {
      userId: userDevice.userId,
      deleted: false,
      content: message.content,
      deviceId: userDevice.deviceId,
      createdAt: new Date().toISOString(),
    };

    const { data: existsData } = await fetchFromTable({
      table: "ClipboardSync",
      match: {
        userId: userDevice.userId,
        content: message.content,
        deviceId: userDevice.deviceId,
      },
      limit: 1,
      orderBy: "createdAt",
      orderDirection: "DESC",
    });
    let id = existsData?.[0].id as string;

    if (id) {
      updateInTable(
        "ClipboardSync",
        { deleted: false, createdAt: new Date().toISOString() },
        { id },
      );
    } else {
      const { data: insertedData } = await insertIntoTable(
        "ClipboardSync",
        value,
      );
      if (!insertedData || !insertedData.length) return;
      id = insertedData[0].id as string;
    }

    usersClipboard.sendMessageToUser(
      {
        id,
        type: "new-clipboard-item",
        content: message.content,
      },
      userDevice.userId,
      (device) => {
        device.setAdditionalData("lastItem", message.content);

        return true;
      },
    );
  } catch {
    // Ignore
  }
};

const onMessage = async (
  buffer: WebSocket.RawData,
  userDevice: NonNullable<ReturnType<typeof usersClipboard.getUser>>,
) => {
  try {
    const message = JSON.parse(
      buffer.toString(),
    ) as ClipboardWebSocketMessage<"sentByApp">;

    if (!userDevice.userId && message.type !== "init")
      userDevice.handleClose(1000, "Must initialize first");

    switch (message.type) {
      case "init":
        handleInit(message, userDevice);
        break;
      case "add-new-item":
        handleAddNewItem(message, userDevice);
        break;
      case "pong": {
        userDevice.pongReceived();
        break;
      }
      default:
        showInfo(chalk.yellow("Unknown clipboard message type:"), message);
        break;
    }
  } catch (error) {
    showError(chalk.red("Error handling Clipboard WebSocket message:"), error);
  }
};

const onConnection = (wsClipboard: WebSocket) => {
  const userDevice = usersClipboard.createUser(wsClipboard);

  wsClipboard.on("message", (buffer) => onMessage(buffer, userDevice));

  wsClipboard.on("close", () => {
    showInfo(
      chalk.red("Clipboard client disconnected:"),
      chalk.yellow(userDevice.userId),
      chalk.green("Device ID:"),
      chalk.yellow(userDevice.deviceId),
    );
    userDevice.handleClose();
  });

  wsClipboard.on("error", (error) => {
    showInfo(
      "Clipboard WebSocket error:",
      error instanceof Error ? error.message : error,
    );
    userDevice.handleClose(1000, "WebSocket error");
  });
};

export const initWebSocketClipboard = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    if (idIntervalClipboard) clearInterval(idIntervalClipboard);
    idIntervalClipboard = setInterval(async () => {
      const users = Object.entries(usersClipboard.getAllUsers());

      users?.forEach(async ([userId, data]) => {
        try {
          if (Object.keys(data.devices).length === 0) return;

          const fetchedData = await fetchFromTable({
            limit: 1,
            table: "ClipboardSync",
            match: { userId: userId, deleted: false },
            orderBy: "createdAt",
            orderDirection: "DESC",
          });

          const lastItem = fetchedData?.data?.[0];
          if (!lastItem) return;

          usersClipboard.sendMessageToUser(
            {
              id: lastItem.id as string,
              type: "new-clipboard-item",
              content: lastItem.content,
            },
            userId,
            (device) => {
              if (device.getAdditionalData("lastItem") === lastItem.content)
                return false;

              device.setAdditionalData("lastItem", lastItem.content);
              return true;
            },
          );
        } catch (error) {
          showError(
            chalk.red("Error sending clipboard data via WebSocket:"),
            error,
          );
        }
      });
    }, 750);

    wss.on("connection", onConnection);

    return wss;
  } catch (error) {
    showError(
      chalk.red("Error initializing Clipboard WebSocket server:"),
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};
