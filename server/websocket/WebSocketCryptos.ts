import {
  Notification,
  LanguagesSupported,
  CryptosWebSocketMessage,
} from "@types";
import chalk from "chalk";
import { Users } from "./WebSocketHandling";
import { config } from "@/config";
import { prisma } from "@/database";
import { cryptos } from "@/routes/cryptos/variables";
import { sendFCMNotification } from "@/firebase/admin";
import WebSocket, { WebSocketServer } from "ws";
import {
  t,
  Helper,
  Logger,
  CRYPTO_NOTIFICATION_INTERVALS,
  CRYPTO_NOTIFICATION_INTERVAL_OPTIONS,
} from "@common";

const logger = new Logger("WebSocketCryptos");

const users = new Users<
  Record<string, unknown>,
  CryptosWebSocketMessage<"sentByServer">
>();

const getPercentGain = (
  price: number,
  cryptoData: DB["TablesServer"]["Cryptos"],
) => {
  if (!cryptoData.firstPricePurchased) return "0%";
  const percentage =
    ((price - cryptoData.firstPricePurchased.toNumber()) /
      cryptoData.firstPricePurchased.toNumber()) *
    100;

  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
};

const getNotificationCrypto = async (
  userCryptos: DB["TablesServer"]["Cryptos"][],
  language: LanguagesSupported,
): Promise<Notification | null> => {
  try {
    const notification: Notification = {
      id: Math.floor(Math.random() * 1000000 + Date.now()),
      type: "info",
      data: { screen: "Cryptos" },
      title: t("notificationNotCryptosSelectedTitle", language),
      message: t("notificationNotCryptosSelectedBody", language),
      channelId: "cryptos",
      timestamp: new Date(),
      reasonNotification: "cryptos",
    };

    if (userCryptos.length === 0) return notification;

    const message = userCryptos
      .map((crypto) => {
        const priceData = cryptos.getCryptoBySymbol(crypto.symbol);
        if (!priceData) return null;

        const price = priceData.price ?? 0;
        const gainPercent = getPercentGain(price, crypto);

        return t("notificationCryptoBody", language, {
          price,
          crypto: crypto.symbol,
          gainPercent,
        });
      })
      .filter((l) => typeof l === "string");

    notification.message = message.join("\n");
    notification.title = t("notificationCryptoTitle", language, {
      cryptos: userCryptos.map((crypto) => crypto.symbol).join(", "),
    });
    return notification;
  } catch (error) {
    logger.error(chalk.red("Error in getNotificationCrypto:"), error);
    return null;
  }
};

const handleSendNotificationsForInterval = async (
  time: DB["Enums"]["CryptoInterval"],
) => {
  try {
    const usersToNotify = await prisma.users.findMany({
      where: {
        notificationsConfigs: {
          some: {
            reason: "cryptos",
            enabled: true,
          },
        },
        cryptosSettings: {
          notifications: {
            enabled: true,
            time,
          },
        },
        cryptos: {
          some: {},
        },
        pushTokens: {
          some: {},
        },
      },
      include: {
        cryptos: true,
        pushTokens: { select: { token: true } },
        userConfig: { select: { language: true } },
      },
    });

    await Promise.all(
      usersToNotify.map(async (user) => {
        const tokens = user.pushTokens
          .map((token) => token.token)
          .filter((token) => !token.startsWith("expo"));

        if (!tokens.length || !user.userConfig || !user.cryptos.length) return;

        const notification = await getNotificationCrypto(
          user.cryptos,
          user.userConfig.language,
        );
        if (!notification) return;

        await sendFCMNotification(
          tokens,
          {
            body: notification.message,
            title: notification.title,
          },
          "cryptos",
          { ...notification.data, screen: "Cryptos" },
        );
      }),
    );
  } catch (error) {
    logger.error(
      `Failed to send crypto notifications for interval ${time}:`,
      error,
    );
  }
};

const initNotificationIntervals = () => {
  CRYPTO_NOTIFICATION_INTERVAL_OPTIONS.forEach((time) => {
    const intervalMs = CRYPTO_NOTIFICATION_INTERVALS[time];
    const id = `notification-interval-${time}`;

    users.setInterval(
      () => handleSendNotificationsForInterval(time),
      intervalMs,
      id,
    );
  });
};
config.executeFunctionAfterInit(initNotificationIntervals);

const sendCryptos = async (
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
  onlyDeviceId?: boolean,
) => {
  try {
    const cryptos = (
      await prisma.cryptos.findMany({
        where: { userId: userDevice.userId },
      })
    ).map((c) =>
      Helper.Object.changeType(c, {
        datePurchased: "string",
        firstPricePurchased: "number",
      }),
    );

    if (onlyDeviceId) {
      userDevice.sendMessage({ type: "cryptos", cryptos });
      return;
    }

    users.setTimeout(
      () => {
        users.sendMessageToUser(
          { type: "cryptos", cryptos },
          userDevice.userId,
        );
      },
      500,
      "send-cryptos-timeout-" + userDevice.userId,
    );
  } catch (error) {
    logger.error(
      "Failed to fetch cryptos for user:",
      logger.secret(userDevice.userId),
      "error:",
      error,
    );
  }
};

const handleSyncSettings = async (
  message: CryptosWebSocketMessage<"sentByApp">,
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
) => {
  if (message.type !== "sync-settings") return;
  const userId = userDevice.userId;

  await prisma.cryptosSettings.upsert({
    where: { userId },
    create: {
      userId,
      autoRefresh: {
        create: {
          enabled: message.settings?.autoRefresh?.enabled ?? undefined,
          valueMs: message.settings?.autoRefresh?.valueMs ?? undefined,
        },
      },
      notifications: {
        create: {
          enabled: message.settings?.notifications?.enabled ?? undefined,
          time: message.settings?.notifications?.time ?? undefined,
        },
      },
      defaultCurrency: message.settings?.defaultCurrency ?? "USDT",
    },
    update: {
      updatedAt: new Date(),
      defaultCurrency: message.settings?.defaultCurrency,
      autoRefresh: {
        upsert: {
          create: {
            enabled: message.settings?.autoRefresh?.enabled ?? undefined,
            valueMs: message.settings?.autoRefresh?.valueMs ?? undefined,
          },
          update: {
            enabled: message.settings?.autoRefresh?.enabled ?? undefined,
            valueMs: message.settings?.autoRefresh?.valueMs ?? undefined,
          },
        },
      },
      notifications: {
        upsert: {
          create: {
            enabled: message.settings?.notifications?.enabled ?? undefined,
            time: message.settings?.notifications?.time ?? undefined,
          },
          update: {
            enabled: message.settings?.notifications?.enabled ?? undefined,
            time: message.settings?.notifications?.time ?? undefined,
          },
        },
      },
    },
    include: { notifications: true, autoRefresh: true },
  });

  users.setTimeout(
    () => {
      users.sendMessageToUser(
        { type: "synced", settings: message.settings },
        userId,
      );
    },
    500,
    "sync-settings-timeout-" + userId,
  );
};

const handleAddCrypto = async (
  message: CryptosWebSocketMessage<"sentByApp">,
  userData: ReturnType<(typeof users)["createUser"]>,
) => {
  if (message.type !== "add-crypto") return;

  try {
    await prisma.cryptos.upsert({
      where: {
        userId_symbol: {
          userId: userData.userId,
          symbol: message.crypto.symbol,
        },
      },
      create: {
        userId: userData.userId,
        symbol: message.crypto.symbol,
        amount: message.crypto.amount,
        baseCoin: message.crypto.baseCoin,
        quoteCoin: message.crypto.quoteCoin,
        datePurchased: new Date(),
        firstPricePurchased: message.crypto.firstPricePurchased,
      },
      update: {
        amount: message.crypto.amount,
        baseCoin: message.crypto.baseCoin,
        quoteCoin: message.crypto.quoteCoin,
        datePurchased: new Date(),
        firstPricePurchased: message.crypto.firstPricePurchased,
      },
    });

    sendCryptos(userData);
  } catch (error) {
    logger.error(
      "Failed to add crypto for user:",
      logger.secret(userData.userId),
      "crypto:",
      logger.secret(
        typeof message.crypto === "object"
          ? JSON.stringify(message.crypto)
          : null,
      ),
      "error:",
      error,
    );
  }
};

const handleDeleteCrypto = async (
  message: CryptosWebSocketMessage<"sentByApp">,
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
) => {
  if (message.type !== "delete-crypto") return;

  try {
    const res = await prisma.cryptos.delete({
      where: {
        userId_symbol: {
          userId: userDevice.userId,
          symbol: message.symbol,
        },
      },
    });

    if (res) sendCryptos(userDevice);
  } catch (error) {
    logger.error(
      "Failed to delete crypto for user:",
      logger.secret(userDevice.userId),
      "symbol:",
      message.symbol,
      "error:",
      error,
    );
  }
};

const handleMessage = async (
  message: string,
  userDevice: ReturnType<(typeof users)["createUser"]>,
) => {
  try {
    const parsedMessage: CryptosWebSocketMessage<"sentByApp"> =
      JSON.parse(message);

    if (parsedMessage.type !== "init" && !userDevice.isValidUserData()) {
      logger.error(
        "Received message before initialization:",
        logger.secret(message),
      );
      userDevice.handleClose(4001, "Initialization required");
      return;
    }

    switch (parsedMessage.type) {
      case "init":
        {
          const { userId, deviceId } = parsedMessage;
          if (!userId || !deviceId) {
            logger.error(
              "Initialization message missing userId or deviceId:",
              logger.secret(message),
            );
            userDevice.handleClose(4002, "Invalid initialization data");
            return;
          }

          userDevice.clearTimeoutToInit();
          userDevice.setUserData({ userId, deviceId });
          users.addDeviceUser(userDevice);

          userDevice.sendMessage({ type: "init-success" });
        }
        break;

      case "sync-settings":
        handleSyncSettings(parsedMessage, userDevice);
        break;
      case "pong":
        userDevice.pongReceived();
        break;
      case "add-crypto":
        handleAddCrypto(parsedMessage, userDevice);
        break;
      case "update-crypto":
        handleAddCrypto(parsedMessage, userDevice);
        break;
      case "delete-crypto":
        handleDeleteCrypto(parsedMessage, userDevice);
        break;
      case "get-cryptos":
        sendCryptos(userDevice, true);
        break;
    }
  } catch (error) {
    logger.error("Failed to parse WebSocket message:", error);
  }
};

const handleConnection = (ws: WebSocket) => {
  const user = users.createUser(ws);

  user.initTimeoutToInit();

  ws.on("message", (message) => {
    handleMessage(message.toString(), user);
  });
};

export const initWebSocketCryptos = () => {
  const ws = new WebSocketServer({ noServer: true });

  ws.on("connection", handleConnection);

  return ws;
};
