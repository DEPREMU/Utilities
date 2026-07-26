import chalk from "chalk";
import { Users } from "./WebSocketHandling.ts";
import { Logger } from "@common";
import { prisma } from "@/database/postgres.ts";
import { ClipboardWebSocketMessage } from "@types";
import { WebSocket, WebSocketServer } from "ws";

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

  Logger.log(
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
    const res = await prisma.clipboardSync.upsert({
      where: {
        userId_deviceId_content: {
          userId: userDevice.userId,
          content: message.content,
          deviceId: userDevice.deviceId,
        },
      },
      create: {
        userId: userDevice.userId,
        content: message.content,
        deviceId: userDevice.deviceId,
      },
      update: {
        deleted: false,
        createdAt: new Date(),
      },
    });

    usersClipboard.sendMessageToUser(
      {
        id: res.id,
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
      case "pong":
        userDevice.pongReceived();
        break;
      default:
        Logger.log(chalk.yellow("Unknown clipboard message type:"), message);
        break;
    }
  } catch (error) {
    Logger.error(
      chalk.red("Error handling Clipboard WebSocket message:"),
      error,
    );
  }
};

const onConnection = (wsClipboard: WebSocket) => {
  const userDevice = usersClipboard.createUser(wsClipboard);

  wsClipboard.on("message", (buffer) => onMessage(buffer, userDevice));

  wsClipboard.on("close", () => {
    Logger.log(
      chalk.red("Clipboard client disconnected:"),
      chalk.yellow(userDevice.userId),
      chalk.green("Device ID:"),
      chalk.yellow(userDevice.deviceId),
    );
    userDevice.handleClose();
  });

  wsClipboard.on("error", (error) => {
    Logger.log("Clipboard WebSocket error:", error);
    userDevice.handleClose(1000, "WebSocket error");
  });
};

export const initWebSocketClipboard = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    if (idIntervalClipboard) clearInterval(idIntervalClipboard);
    idIntervalClipboard = setInterval(async () => {
      const users = usersClipboard.getAllUsers();

      users.forEach(async (data, userId) => {
        try {
          if (data.devices.size === 0) return;

          const lastItem = await prisma.clipboardSync.findFirst({
            take: 1,
            where: { userId, deleted: false },
            orderBy: { createdAt: "desc" },
          });

          if (!lastItem) return;

          usersClipboard.sendMessageToUser(
            {
              id: lastItem.id,
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
          Logger.error(
            chalk.red("Error sending clipboard data via WebSocket:"),
            error,
          );
        }
      });
    }, 750);

    wss.on("connection", onConnection);

    return wss;
  } catch (error) {
    Logger.error(
      chalk.red("Error initializing Clipboard WebSocket server:"),
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};
