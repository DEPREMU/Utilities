import chalk from "chalk";
import { Users } from "./WebSocketHandling.ts";
import { Logger } from "@common";
import { WebSocketMessage } from "@types";
import WebSocket, { WebSocketServer } from "ws";
import { prisma } from "@/database/postgres.ts";

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
    Logger.error(
      chalk.red("Error in handleInitWebSocket:"),
      error instanceof Error ? error.message : error,
    );
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
        Logger.log(chalk.yellow("Unknown message type:"), message);
        break;
    }
  } catch (error) {
    Logger.error(
      chalk.red("Error handling WebSocket message:"),
      error instanceof Error ? error.message : error,
    );
  }
};

const connectionWss = (ws: WebSocket) => {
  let isErrorClose = false;
  const userDevice = users.createUser(ws);

  Logger.log(chalk.green("New client connected"));

  try {
    ws.on("message", (buffer) => {
      onMessage(buffer, userDevice);
    });

    ws.on("close", (code, reason) => {
      if (!isErrorClose)
        Logger.log(
          chalk.red("Client"),
          chalk.yellow(userDevice.userId),
          chalk.red("disconnected:"),
          code,
          chalk.yellow(reason.toString()),
        );
      userDevice.handleClose(code, reason.toString());
    });

    ws.on("error", (error) => {
      isErrorClose = true;
      Logger.log(
        chalk.red("WebSocket error for client:"),
        chalk.yellow(userDevice.userId),
        chalk.red("-"),
        error,
      );
      ws.close();
    });
  } catch (error) {
    Logger.error(
      chalk.red("Error in connectionWss:"),
      error instanceof Error ? error.message : error,
    );
  }
};

export const initWebSocket = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", connectionWss);

    return wss;
  } catch (error) {
    Logger.error(chalk.red("Error initializing WebSocket server:"), error);
    throw error;
  }
};
