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
  ClipboardSync,
  ScreensAvailable,
  WebSocketMessage,
  WebSocketResponse,
  ReasonNotification,
  LanguagesSupported,
  UserNotificationsConfig,
  ClipboardWebSocketMessage,
} from "@types";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import { dataBinance } from "./cryptos.ts";
import { sendFCMNotification } from "firebase/admin.ts";
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
    const fetchedData = await fetchFromTable("UserConfig", {
      userId: config.userId,
    });
    let data = fetchedData.data;
    if (Array.isArray(data)) data = null;

    if (!data) return await insertIntoTable("UserConfig", config);
    updateInTable("UserConfig", { id: data.id }, { id: data.id });
  } catch (error) {
    console.error(chalk.red("Error in insertUserConfig:"), error);
  }
};

const handleInitWebSocket = (data: WebSocketMessage, ws: WebSocket): string => {
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
      ws.ping();
    }, 29000);

    ws.on("pong", () => {
      if (!users[data.userId]) return;

      const timeoutId = users[data.userId].pingTimeoutId;
      if (timeoutId) clearTimeout(timeoutId);
      users[data.userId].pingTimeoutId = null;
    });

    if (!users[data.userId]) {
      users[data.userId] = {
        ws,
        intervalsId: null,
        pingTimeoutId: null,
        pingIntervalId,
      };
    }
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

    const message: WebSocketResponse = {
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
    const fetchedData = await fetchFromTable("UserNotificationsConfig", {
      userId,
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
  try {
    const getNotificationCrypto = async (
      cryptos: Cryptos[],
    ): Promise<Notification | null> => {
      try {
        const id = Math.floor(Math.random() * 1000000);

        const fetchedData = await fetchFromTable("UserConfig", {
          userId,
        });

        let dataLang = fetchedData.data;
        if (Array.isArray(dataLang)) dataLang = dataLang[0];
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
      data: WebSocketMessage,
      ws: WebSocket,
      interval: number,
    ) => {
      try {
        if (data.type !== "notifications") return;

        if (!users[data.userId]) {
          users[data.userId] = {
            ws,
            intervalsId: null,
            pingTimeoutId: null,
            pingIntervalId: null,
          };
        }

        const handleInterval = async () => {
          const fetchedData = await fetchFromTable("Cryptos", {
            userId: data.userId,
          });

          let cryptos = fetchedData.data;
          if (!cryptos) cryptos = [];
          if (!Array.isArray(cryptos)) cryptos = [cryptos];

          if (!cryptos || cryptos.length === 0) return;
          const notification = await getNotificationCrypto(cryptos);
          if (!notification) return;

          const message: WebSocketResponse = {
            type: "notification",
            notification,
          };

          if (ws.readyState === WebSocket.OPEN)
            return ws.send(JSON.stringify(message));

          const tokens = await fetchFromTable("PushTokens", {
            userId: data.userId,
          });
          let pushTokens = tokens.data;
          if (!pushTokens) pushTokens = [];
          if (!Array.isArray(pushTokens)) pushTokens = [pushTokens];

          sendFCMNotification(
            pushTokens.map((token) => token.token).filter(Boolean),
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
        };

        const intervalOld = users[data.userId].intervalsId?.cryptos;
        if (intervalOld) clearInterval(intervalOld);

        const intervalId = setInterval(handleInterval, interval);
        users[data.userId].intervalsId = {
          ...(users[data.userId].intervalsId || {
            streamers: null,
            downDetector: null,
            batteryAlerts: null,
            locationEnabled: null,
            allNotifications: null,
            noInternetConnection: null,
          }),
          cryptos: intervalId,
        };
      } catch (error) {
        console.error(chalk.red("Error in handleNotificationCrypto:"), error);
      }
    };

    const handleNotifications = (data: WebSocketMessage, ws: WebSocket) => {
      try {
        if (data.type !== "notifications") return;

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

    let userId: string;
    console.log(chalk.green("New client connected"));

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
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

export const initWebSocketClipboard = () => {
  try {
    const wss = new WebSocketServer({ noServer: true });
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

    setInterval(() => {
      const users = Object.entries(usersClipboard || {});

      users?.forEach(async ([userId, devices]) => {
        try {
          const fetchedData = await fetchFromTable("ClipboardSync", {
            userId,
            deleted: false,
          });
          let dataLang = fetchedData?.data;
          if (!dataLang) return;

          if (!Array.isArray(dataLang)) dataLang = [dataLang];
          if (dataLang.length === 0) return;
          let lastItem: ClipboardSync = dataLang[0];

          if (dataLang.length > 1)
            lastItem = dataLang.sort(
              (a, b) =>
                new Date(b?.createdAt).getTime() -
                new Date(a?.createdAt).getTime(),
            )?.[0];
          if (!lastItem) return;

          const devicesEntries = Object.entries(devices);

          devicesEntries.forEach(([deviceId, device]) => {
            try {
              if (device.lastContent === lastItem.content) return;
              if (device.ws.readyState !== WebSocket.OPEN) {
                deleteDevice({ userId, deviceId });
                return;
              }
              const message: ClipboardWebSocketMessage = {
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
      let data: { userId: string; deviceId: string } = {
        userId: "",
        deviceId: "",
      };

      connectionClipboard.on("message", async (buffer) => {
        const message = JSON.parse(
          buffer.toString(),
        ) as ClipboardWebSocketMessage;

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
              connectionClipboard.ping();
            }, 29000);

            connectionClipboard.on("pong", () => {
              if (!usersClipboard[data.userId]) return;
              if (!usersClipboard[data.userId][data.deviceId]) return;

              const timeoutId =
                usersClipboard[data.userId][data.deviceId].pingTimeoutId;
              if (timeoutId) clearTimeout(timeoutId);

              usersClipboard[data.userId][data.deviceId].pingTimeoutId = null;
            });

            usersClipboard[data.userId] = {
              ...usersClipboard[data.userId],
              [data.deviceId]: {
                ws: connectionClipboard,
                lastContent: null,
                pingTimeoutId: null,
                pingIntervalId: pingIntervalId,
              },
            };
            break;
          }
          case "add-new-item": {
            const value: ClipboardSync = {
              deviceId: data.deviceId,
              content: message.content,
              createdAt: new Date().toISOString(),
              userId: data.userId,
            };

            const result = await insertIntoTable("ClipboardSync", value);
            if (result.error) {
              console.error(
                chalk.red("Error inserting clipboard item into database:"),
                result.error,
              );
              return;
            }
            const devices = usersClipboard[data.userId];
            if (!devices) return;
            Object.entries(devices).forEach(([deviceId, device]) => {
              try {
                if (deviceId === data.deviceId) return;
                if (device.ws.readyState !== WebSocket.OPEN) {
                  deleteDevice({ userId: data.userId, deviceId });
                  return;
                }
                const msg: ClipboardWebSocketMessage = {
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
          default:
            console.log(
              chalk.yellow("Unknown clipboard message type:"),
              message,
            );
            break;
        }
      });

      connectionClipboard.on("close", () => {
        deleteDevice(data);
      });

      connectionClipboard.on("error", (error) => {
        console.log("Clipboard WebSocket error:", error);
        connectionClipboard.close();
        deleteDevice(data);
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
