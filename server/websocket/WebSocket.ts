import {
  updateInTable,
  fetchFromTable,
  insertIntoTable,
  deleteSessions,
} from "../database/functions.ts";
import {
  Cryptos,
  UserConfig,
  Notification,
  Notifications,
  ScreensAvailable,
  WebSocketMessage,
  ReasonNotification,
  LanguagesSupported,
  UserNotificationsConfig,
} from "@types";
import chalk from "chalk";
import { t } from "@common";
import { dataBinance } from "../routes/cryptos.ts";
import { sendFCMNotification } from "../firebase/admin.ts";
import WebSocket, { WebSocketServer } from "ws";

deleteSessions();

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
    console.error(chalk.red("Error in insertUserConfig:"), error);
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
        console.log(
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

    insertNotifications(data.userId, data.notifications || null);
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
    console.error(chalk.red("Error in handleInitWebSocket:"), error);
    return "";
  }
};

const insertNotifications = async (
  userId: string,
  notifications: Notifications | null,
) => {
  try {
    const fetchedData = await fetchFromTable({
      table: "UserNotificationsConfig",
      match: { userId },
    });
    let data = fetchedData.data;

    if (!data) return;
    if (!Array.isArray(data)) data = [data];

    await Promise.all(
      data.map(async (item: UserNotificationsConfig) => {
        let newData: UserNotificationsConfig = {
          ...item,
          updatedAt: new Date().toISOString(),
        };
        if (item.reason !== "streamers")
          newData = {
            ...newData,
            enabled: notifications?.enabled?.[item.reason] as boolean,
            interval: notifications?.intervals?.[item.reason] || -1,
          };
        else if (notifications?.enabled.streamers && item.streamer)
          newData = {
            ...newData,
            enabled:
              notifications?.enabled?.streamers?.[item.streamer]?.enabled ||
              false,
          };

        updateInTable("UserNotificationsConfig", newData, { id: item.id });
      }),
    );
  } catch (error) {
    console.error(chalk.red("Error in insertNotifications:"), error);
  }
};

const connectionWss = (ws: WebSocket) => {
  let userId: string;
  console.log(chalk.green("New client connected"));

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
        console.error(chalk.red("Error in getNotificationCrypto:"), error);
        return null;
      }
    };

    const handleNotificationCrypto = async (
      data: WebSocketMessage<"sentByApp"> & { type: "notifications" },
      ws: WebSocket,
      interval: number,
    ) => {
      try {
        if (!users[data.userId]) {
          users[data.userId] = {
            ws,
            intervalsId: null,
            pingTimeoutId: null,
            pingIntervalId: null,
          };
        }

        const handleInterval = async () => {
          try {
            const fetchedData = await fetchFromTable({
              table: "Cryptos",
              match: { userId: data.userId },
            });

            let cryptos = fetchedData.data;
            if (!cryptos) cryptos = [];
            if (!Array.isArray(cryptos)) cryptos = [cryptos];

            if (!cryptos || cryptos.length === 0) return;
            const notification = await getNotificationCrypto(cryptos);
            if (!notification) return;

            const message: WebSocketMessage<"sentByServer"> = {
              type: "notification",
              notification,
            };

            if (ws.readyState === WebSocket.OPEN)
              return ws.send(JSON.stringify(message));

            const tokens = await fetchFromTable({
              table: "PushTokens",
              match: { userId: data.userId },
            });
            const pushTokens = (tokens.data || [])?.map((dt) => dt.token);
            if (!pushTokens || pushTokens.length === 0) return;

            sendFCMNotification(
              pushTokens,
              {
                title: notification.title,
                body: notification.message,
              },
              notification.channelId,
              {
                ...(notification.data || {}),
                screen:
                  (notification.data?.screen as ScreensAvailable) || "Cryptos",
              },
            );
          } catch (error) {
            console.error(
              chalk.red("Error in handleInterval of handleNotificationCrypto:"),
              error,
            );
          }
        };

        const intervalId = setInterval(handleInterval, interval);
        users[data.userId].intervalsId = {
          ...(users[data.userId].intervalsId || {
            streamers: null,
            downDetector: null,
            batteryAlerts: null,
            locationEnabled: null,
            allNotifications: null,
            noInternetConnection: null,
            loggedInStatusChannel: null,
          }),
          cryptos: intervalId,
        };
      } catch (error) {
        console.error(chalk.red("Error in handleNotificationCrypto:"), error);
      }
    };

    const handleNotifications = (
      data: WebSocketMessage<"sentByApp"> & { type: "notifications" },
      ws: WebSocket,
    ) => {
      try {
        insertNotifications(data.userId, data.data);

        if (!users[data.userId]) {
          users[data.userId] = {
            ws,
            intervalsId: null,
            pingTimeoutId: null,
            pingIntervalId: null,
          };
        }
        if (!data.data.enabled.allNotifications) return;
        Object.entries(data.data.enabled).forEach(([key, value]) => {
          try {
            if (key === "allNotifications") return;
            const keyTyped = key as ReasonNotification;
            if (!value) return;

            const interval = data.data.intervals[keyTyped];
            if (!interval) return;
            switch (keyTyped) {
              case "cryptos":
                handleNotificationCrypto(data, ws, interval);
                break;

              default:
                break;
            }
          } catch {
            // Ignore
          }
        });
      } catch (error) {
        console.error(chalk.red("Error in handleNotifications:"), error);
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
          case "notifications":
            handleNotifications(data, ws);
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
            console.log(chalk.yellow("Unknown message type:"), data);
            break;
        }
      } catch (error) {
        console.error(chalk.red("Error handling WebSocket message:"), error);
      }
    });

    ws.on("close", (code, reason) => {
      console.log(
        chalk.red("Client"),
        chalk.yellow(userId),
        chalk.red("disconnected:"),
        code,
        chalk.yellow(reason.toString()),
      );
      handleClose();
    });

    ws.on("error", (error) => {
      console.log(
        chalk.red("WebSocket error for client:"),
        chalk.yellow(userId),
        chalk.red("-"),
        error,
      );
      ws.close?.();
    });
  } catch (error) {
    console.error(chalk.red("Error in connectionWss:"), error);
  }
};

export const initWebSocket = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", connectionWss);

    return wss;
  } catch (error) {
    console.error(chalk.red("Error initializing WebSocket server:"), error);
    throw error;
  }
};
