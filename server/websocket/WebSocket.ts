import chalk from "chalk";
import { Users } from "./WebSocketHandling";
import { Logger } from "@common";
import { prisma } from "@/database/postgres";
import { WebSocketMessage } from "@types";
import WebSocket, { WebSocketServer } from "ws";

const logger = new Logger("WebSocket");

const users = new Users<
  Record<string, unknown>,
  WebSocketMessage<"sentByServer">
>();

const handleInitWebSocket = (
  data: WebSocketMessage<"sentByApp">,
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
): void => {
  if (data.type !== "init") return;

  try {
    userDevice.clearAllTimers();

    userDevice.setUserData({
      userId: data.userId,
      deviceId: data.deviceId,
    });
    users.addDeviceUser(userDevice);

    userDevice.sendMessage({ type: "init-success" });
  } catch (error) {
    logger.error(chalk.red("Error in handleInitWebSocket:"), error);
  }
};

const onMessage = (
  buffer: WebSocket.RawData,
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
) => {
  try {
    const message = JSON.parse(
      buffer.toString(),
    ) as WebSocketMessage<"sentByApp">;

    switch (message.type) {
      case "init":
        handleInitWebSocket(message, userDevice);
        break;
      case "language-change":
        void prisma.userConfig.update({
          data: { language: message.language },
          where: { userId: userDevice.userId },
        });
        break;
      case "pong":
        userDevice.pongReceived();
        break;
      default:
        logger.log(
          chalk.yellow("Unknown message type:"),
          logger.secret(message),
        );
        break;
    }
  } catch (error) {
    logger.error(chalk.red("Error handling WebSocket message:"), error);
  }
};

const connectionWss = (ws: WebSocket) => {
  let isErrorClose = false;
  const userDevice = users.createUser(ws);

  logger.log(chalk.green("New client connected"));

  try {
    ws.on("message", (buffer) => {
      onMessage(buffer, userDevice);
    });

    ws.on("close", (code, reason) => {
      if (!isErrorClose)
        logger.log(
          chalk.red("Client"),
          chalk.yellow(logger.secret(userDevice.userId)),
          chalk.red("disconnected:"),
          code,
          chalk.yellow(reason.toString()),
        );

      userDevice.handleClose(code, reason.toString());

      users.removeUserDevice(userDevice);
    });

    ws.on("error", (error) => {
      isErrorClose = true;
      logger.log(
        chalk.red("WebSocket error for client:"),
        chalk.yellow(logger.secret(userDevice.userId)),
        chalk.red("-"),
        error,
      );
      ws.close();
    });
  } catch (error) {
    logger.error(chalk.red("Error in connectionWss:"), error);
  }
};

export const sendWebSocketMessageToUser = (
  userId: string,
  message: WebSocketMessage<"sentByServer">,
): void => {
  users.sendMessageToUser(message, userId);
};

export const initWebSocket = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", connectionWss);

    return wss;
  } catch (error) {
    logger.error(chalk.red("Error initializing WebSocket server:"), error);
    throw error;
  }
};
