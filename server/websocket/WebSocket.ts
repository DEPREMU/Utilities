import {
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import {
  Cryptos,
  UserConfig,
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

const users: Record<
  string,
  {
    ws: WebSocket;
    intervalsId: Record<
      ReasonNotification,
      NodeJS.Timeout | number | null
    > | null;
    pingTimeoutId: NodeJS.Timeout | number | null;
    pingIntervalId: NodeJS.Timeout | number | null;
  }
> = {};

const getPercentGain = (priceUsd: number, cryptoData: Cryptos) => {
  if (!cryptoData.firstPricePurchased) return "0%";
  const percentage =
    ((priceUsd - cryptoData.firstPricePurchased) /
      cryptoData.firstPricePurchased) *
    100;

  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
};

const insertUserConfig = async (config: UserConfig) => {
  try {
    const fetchedData = await fetchFromTable({
      table: "UserConfig",
      match: { userId: config.userId },
    });
    const data = fetchedData.data?.[0];

    if (!data) return await insertIntoTable("UserConfig", config);
    updateInTable("UserConfig", { id: data.id }, { id: data.id });
  } catch (error) {
    showError(chalk.red("Error in insertUserConfig:"), error);
  }
};

const handleInitWebSocket = (
  data: WebSocketMessage<"sentByApp">,
  ws: WebSocket,
): string => {
  if (data.type !== "init") return "";

  try {
    const pingIntervalIdOld = users?.[data.userId]?.pingIntervalId;
    if (pingIntervalIdOld) clearInterval(pingIntervalIdOld);

    const pingIntervalId = setInterval(() => {
      users[data.userId].pingTimeoutId = setTimeout(() => {
        showInfo(
          chalk.red("Terminating unresponsive client:"),
          chalk.yellow(data.userId),
        );
        ws.close?.();
      }, 10000);
      ws.send(JSON.stringify({ type: "ping" }));
    }, 29000);

    if (!users[data.userId]) {
      users[data.userId] = {
        ws,
        intervalsId: null,
        pingTimeoutId: null,
        pingIntervalId,
      };
    } else users[data.userId].pingIntervalId = pingIntervalId;

    insertUserConfig({
      userId: data.userId,
      language: data.language || "en",
      theme: data.theme || "auto",
      hasAdmin: data.hasAdmin || false,
      updatedAt: new Date().toISOString(),
    });

    if (users[data.userId].ws !== ws) {
      if (users[data.userId].ws.readyState === WebSocket.OPEN) {
        users[data.userId].ws.close();
      }
      users[data.userId].ws = ws;
    }

    const message: WebSocketMessage<"sentByServer"> = {
      type: "init-success",
      message: "WebSocket initialized successfully",
    };
    ws.send(JSON.stringify(message));

    return data.userId;
  } catch (error) {
    showError(chalk.red("Error in handleInitWebSocket:"), error);
    return "";
  }
};

const connectionWss = (ws: WebSocket) => {
  let userId: string;
  showInfo(chalk.green("New client connected"));

  try {
    const getNotificationCrypto = async (
      cryptos: Cryptos[],
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

    const handleClose = () => {
      if (!users[userId]) return;

      const pingTimeoutId = users[userId].pingTimeoutId;
      if (pingTimeoutId) clearTimeout(pingTimeoutId);

      const pingIntervalId = users[userId].pingIntervalId;
      if (pingIntervalId) clearInterval(pingIntervalId);

      const intervalsId = users[userId].intervalsId;
      if (!intervalsId) return;

      Object.values(intervalsId).forEach((intervalId) => {
        if (intervalId) clearInterval(intervalId);
      });
      ws.removeAllListeners();
    };

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(
          message.toString(),
        ) as WebSocketMessage<"sentByApp">;

        switch (data.type) {
          case "init":
            userId = handleInitWebSocket(data, ws);
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
            if (!users[userId]) return ws.close();

            const timeoutId = users[userId].pingTimeoutId;
            if (timeoutId) clearTimeout(timeoutId);

            users[userId].pingTimeoutId = null;
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
      showInfo(
        chalk.red("Client"),
        chalk.yellow(userId),
        chalk.red("disconnected:"),
        code,
        chalk.yellow(reason.toString()),
      );
      handleClose();
    });

    ws.on("error", (error) => {
      showInfo(
        chalk.red("WebSocket error for client:"),
        chalk.yellow(userId),
        chalk.red("-"),
        error,
      );
      ws.close?.();
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
