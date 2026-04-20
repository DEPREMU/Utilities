import {
  Crypto,
  Notification,
  WebSocketMessage,
  ReasonNotification,
  LanguagesSupported,
} from "@types";
import chalk from "chalk";
import { t } from "@common";
import { dataBinance } from "../routes/cryptos.ts";
import { showError, showInfo } from "../functions/logger.ts";
import { sendFCMNotification } from "../firebase/admin.ts";
import WebSocket, { WebSocketServer } from "ws";
import { updateInTable, fetchFromTable } from "../database/functions.ts";

type Timeout = NodeJS.Timeout | number | null;

type UsersWS = {
  [userId: string]: {
    [deviceId: string]: {
      ws: WebSocket;
      intervalsId: Record<ReasonNotification, Timeout> | null;
      pingTimeoutId: Timeout;
      pingIntervalId: Timeout;
    };
  };
};

const users: UsersWS = {};

const getPercentGain = (priceUsd: number, cryptoData: Crypto) => {
  if (!cryptoData.firstPricePurchased) return "0%";
  const percentage =
    ((priceUsd - cryptoData.firstPricePurchased) /
      cryptoData.firstPricePurchased) *
    100;

  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
};

const handleInitWebSocket = (
  data: WebSocketMessage<"sentByApp">,
  ws: WebSocket,
): void => {
  if (data.type !== "init") return;

  try {
    const pingIntervalIdOld =
      users[data.userId]?.[data.deviceId]?.pingIntervalId;
    if (pingIntervalIdOld) clearInterval(pingIntervalIdOld);

    const pingIntervalId = setInterval(() => {
      users[data.userId][data.deviceId].pingTimeoutId = setTimeout(() => {
        showInfo(
          chalk.red("Terminating unresponsive client:"),
          chalk.yellow(data.userId),
        );
        ws.close?.();
      }, 10000);
      ws.send(JSON.stringify({ type: "ping" }));
    }, 30000);

    if (!users[data.userId] || !users[data.userId][data.deviceId]) {
      users[data.userId] = {
        ...(users[data.userId] || {}),
        [data.deviceId]: {
          ws,
          intervalsId: null,
          pingTimeoutId: null,
          pingIntervalId,
        },
      };
    } else {
      users[data.userId][data.deviceId].pingIntervalId = pingIntervalId;
      if (users[data.userId][data.deviceId].pingTimeoutId) {
        clearTimeout(users[data.userId][data.deviceId].pingTimeoutId as number);
      }
    }

    if (users[data.userId][data.deviceId].ws !== ws) {
      users[data.userId][data.deviceId].ws.terminate();
      users[data.userId][data.deviceId].ws = ws;
    }

    const message: WebSocketMessage<"sentByServer"> = {
      type: "init-success",
      message: "WebSocket initialized successfully",
    };
    ws.send(JSON.stringify(message));
  } catch (error) {
    showError(chalk.red("Error in handleInitWebSocket:"), error);
  }
};

const handleClose = (userId: string, deviceId: string, ws: WebSocket) => {
  ws.removeAllListeners();

  const deviceObj = users[userId]?.[deviceId];
  if (!deviceObj) return;

  const pingTimeoutId = deviceObj.pingTimeoutId;
  deviceObj.pingTimeoutId = null;
  if (pingTimeoutId) clearTimeout(pingTimeoutId);

  const pingIntervalId = deviceObj.pingIntervalId;
  deviceObj.pingIntervalId = null;
  if (pingIntervalId) clearInterval(pingIntervalId);

  const intervalsId = deviceObj.intervalsId;
  deviceObj.intervalsId = null;
  if (!intervalsId) return;

  Object.values(intervalsId).forEach((intervalId) => {
    if (intervalId) clearInterval(intervalId);
  });
};

const getNotificationCrypto = async (
  cryptos: Crypto[],
  userId: string,
): Promise<Notification | null> => {
  try {
    const id = Math.floor(Math.random() * 1000000);

    const fetchedData = await fetchFromTable({
      table: "UserConfig",
      match: { userId },
    });

    const dataLang = fetchedData.data?.[0];
    const language = (dataLang?.language || "en") as LanguagesSupported;

    if (!cryptos || cryptos?.length === 0)
      return {
        title: t("notificationNotCryptosSelectedTitle", language),
        message: t("notificationNotCryptosSelectedBody", language),
        reasonNotification: "cryptos",
        channelId: "cryptos",
        id,
        type: "info",
        timestamp: new Date(),
        overrideNotification: false,
        data: {
          screen: "Cryptos",
        },
      };

    if (!dataBinance || !Array.isArray(dataBinance)) return null;
    const prices = cryptos?.map((crypto) => {
      const priceData = dataBinance?.find(
        (item) => item.symbol === `${crypto.id}${crypto.currency}`,
      );
      return priceData ? priceData.price : 0;
    });
    const percentageGains = prices.map((price, index) =>
      getPercentGain(price, cryptos[index]),
    );
    const message = cryptos
      .map((crypto, index) =>
        t("notificationCryptoBody", language, {
          crypto: crypto.id,
          price: prices[index],
          gainPercent: percentageGains[index],
        }),
      )
      .join("\n");

    const notification: Notification = {
      message,
      reasonNotification: "cryptos",
      channelId: "cryptos",
      title: t("notificationCryptoTitle", language, {
        cryptos: cryptos.map((crypto) => crypto.id).join(", "),
      }),
      id,
      type: "info",
      timestamp: new Date(),
      overrideNotification: false,
      data: {
        screen: "Cryptos",
      },
    };
    return notification;
  } catch (error) {
    showError(chalk.red("Error in getNotificationCrypto:"), error);
    return null;
  }
};

const connectionWss = (ws: WebSocket) => {
  let isErrorClose = false;

  let userId: string;
  let deviceId: string;
  showInfo(chalk.green("New client connected"));

  try {
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(
          message.toString(),
        ) as WebSocketMessage<"sentByApp">;

        switch (data.type) {
          case "init":
            handleInitWebSocket(data, ws);
            userId = data.userId;
            deviceId = data.deviceId;

            break;
          case "language-change":
            if (!users[userId]) return;
            updateInTable(
              "UserConfig",
              { language: data.language },
              { userId },
            );
            break;
          case "pong": {
            if (!users[userId] || !users[userId][deviceId]) return ws.close();

            const timeoutId = users[userId][deviceId].pingTimeoutId;
            users[userId][deviceId].pingTimeoutId = null;
            if (timeoutId) clearTimeout(timeoutId);

            break;
          }
          default:
            showInfo(chalk.yellow("Unknown message type:"), data);
            break;
        }
      } catch (error) {
        showError(chalk.red("Error handling WebSocket message:"), error);
      }
    });

    ws.on("close", (code, reason) => {
      if (!isErrorClose)
        showInfo(
          chalk.red("Client"),
          chalk.yellow(userId),
          chalk.red("disconnected:"),
          code,
          chalk.yellow(reason.toString()),
        );
      handleClose(userId, deviceId, ws);
    });

    ws.on("error", (error) => {
      isErrorClose = true;
      showInfo(
        chalk.red("WebSocket error for client:"),
        chalk.yellow(userId),
        chalk.red("-"),
        error,
      );
      ws.close();
    });
  } catch (error) {
    showError(chalk.red("Error in connectionWss:"), error);
  }
};

export const initWebSocket = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", connectionWss);

    return wss;
  } catch (error) {
    showError(chalk.red("Error initializing WebSocket server:"), error);
    throw error;
  }
};
