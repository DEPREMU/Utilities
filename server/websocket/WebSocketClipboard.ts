import chalk from "chalk";
import { Users } from "./WebSocketHandling";
import { Logger } from "@common";
import { prisma } from "@/database/postgres";
import { ClipboardWebSocketMessage } from "@types";
import { WebSocket, WebSocketServer } from "ws";

const logger = new Logger("WebSocketClipboard");

const usersClipboard = new Users<
  { lastSyncGlobal: Record<string, number> },
  ClipboardWebSocketMessage<"sentByServer">,
  { lastSync?: number }
>();
usersClipboard.setAdditionalData("lastSyncGlobal", {});

const handleInit = (
  message: Extract<ClipboardWebSocketMessage<"sentByApp">, { type: "init" }>,
  userDevice: NonNullable<ReturnType<typeof usersClipboard.getUser>>,
) => {
  userDevice.clearTimeoutToInit();

  if (!message.userId || !message.deviceId) {
    userDevice.handleClose(1000, "Invalid init data");
    return;
  }

  userDevice.setUserData({
    userId: message.userId,
    deviceId: message.deviceId,
  });
  usersClipboard.addDeviceUser(userDevice);

  logger.log(
    chalk.green("New clipboard client connected:"),
    chalk.yellow(logger.secret(userDevice.userId)),
    chalk.green("Device ID:"),
    chalk.yellow(logger.secret(userDevice.deviceId)),
  );
};

const handleAddNewItem = async (
  message: Extract<
    ClipboardWebSocketMessage<"sentByApp">,
    { type: "add-new-item" }
  >,
  userDevice: NonNullable<ReturnType<typeof usersClipboard.getUser>>,
) => {
  try {
    const res = await prisma.clipboardSync.upsert({
      select: { id: true },
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

    const now = Date.now();
    usersClipboard.setAdditionalData("lastSyncGlobal", (prev) => ({
      ...prev,
      [userDevice.userId]: now,
    }));
    usersClipboard.sendMessageToUser(
      {
        id: res.id,
        type: "new-clipboard-item",
        content: message.content,
      },
      userDevice.userId,
      (device) => {
        device.setAdditionalData("lastSync", now);

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
        logger.log(
          chalk.yellow("Unknown clipboard message type:"),
          logger.secret(message),
        );
        break;
    }
  } catch (error) {
    logger.error(
      chalk.red("Error handling Clipboard WebSocket message:"),
      error,
    );
  }
};

const onConnection = (wsClipboard: WebSocket) => {
  const userDevice = usersClipboard.createUser(wsClipboard);

  userDevice.initTimeoutToInit();

  wsClipboard.on("message", (buffer) => onMessage(buffer, userDevice));

  wsClipboard.on("close", () => {
    logger.log(
      chalk.red("Clipboard client disconnected:"),
      chalk.yellow(logger.secret(userDevice.userId)),
      chalk.green("Device ID:"),
      chalk.yellow(logger.secret(userDevice.deviceId)),
    );
    userDevice.handleClose();
    usersClipboard.removeUserDevice(userDevice);
  });

  wsClipboard.on("error", (error) => {
    logger.log("Clipboard WebSocket error:", error);
    userDevice.handleClose(1000, "WebSocket error");
  });
};

export const initWebSocketClipboard = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", onConnection);

    return wss;
  } catch (error) {
    logger.error(
      chalk.red("Error initializing Clipboard WebSocket server:"),
      error,
    );
    throw error;
  }
};
