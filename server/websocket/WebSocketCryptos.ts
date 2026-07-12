import {
  Notification,
  CryptosSettings,
  LanguagesSupported,
  CryptosWebSocketMessage,
} from "@types";
import chalk from "chalk";
import { Users } from "./WebSocketHandling.ts";
import { prisma } from "@/database/postgres.ts";
import { cryptos } from "@/routes/cryptos/variables.ts";
import { sendFCMNotification } from "@/firebase/admin.ts";
import { executeFunctionAfterInit } from "@/config.ts";
import WebSocket, { WebSocketServer } from "ws";
import { t, Logger, SelectedCryptos } from "@common";

const users = new Users<
  {
    cryptoSettings?: {
      [userId: string]: CryptosSettings;
    };
  },
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
      overrideNotification: false,
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
    Logger.error(
      chalk.red("Error in getNotificationCrypto:"),
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

const handleSendNotification = async (userId: string) => {
  const user = await prisma.users.findUnique({
    where: { userId },
    include: {
      cryptos: true,
      pushTokens: { select: { token: true } },
      userConfig: { select: { language: true } },
    },
  });
  if (!user) return;

  const tokens = user.pushTokens
    .map((t) => t.token)
    .filter((t) => !t.startsWith("expo"));

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
};

const initUserInterval = async (userId: string) => {
  try {
    const user = await prisma.users.findUnique({
      where: { userId },
      include: {
        notificationsConfigs: {
          where: { reason: "cryptos" },
        },
        cryptosSettings: {
          include: { notifications: true, autoRefresh: true },
        },
      },
    });

    if (!user) return;
    if (!user.notificationsConfigs || user.notificationsConfigs.length === 0)
      return;

    let settings = user.cryptosSettings;

    if (!settings) {
      const res = await prisma.cryptosSettings.create({
        data: {
          userId,
          autoRefresh: { create: {} },
          notifications: { create: {} },
        },
        include: { notifications: true, autoRefresh: true },
      });
      if (res) settings = res;
    }

    if (!settings || !settings.notifications) return;

    const id = "notification-interval-" + userId;

    if (user.notificationsConfigs[0].enabled) {
      users.setInterval(
        () => handleSendNotification(userId),
        settings.notifications.valueMs,
        id,
      );
    } else {
      users.clearInterval(id);
    }
  } catch (error) {
    Logger.error(
      "Failed to initialize user notification interval for WebSocketCryptos:",
      error,
    );
  }
};

const initUsersInterval = async () => {
  try {
    const users = await prisma.users.findMany({
      select: { userId: true },
    });

    users.forEach((user) => {
      if (!user.userId) return;

      initUserInterval(user.userId);
    });
  } catch (error) {
    Logger.error(
      "Failed to initialize users notifications for WebSocketCryptos:",
      error,
    );
  }
};
executeFunctionAfterInit(initUsersInterval);

const isCrypto = (
  data: Record<string, unknown>,
): data is SelectedCryptos[string] => {
  const isObj = data !== null && typeof data === "object";

  return (
    isObj &&
    (typeof data.symbol === "string" || typeof data.baseCoin === "string")
  );
};

const getDiff = <T extends Record<string, unknown>>(
  original: T,
  update: Partial<T>,
): Partial<T> => {
  const diff = Object.fromEntries(
    Object.entries(update).filter(([key, value]) => {
      const existingValue = original[key as keyof T];
      return JSON.stringify(existingValue) !== JSON.stringify(value);
    }),
  ) as Partial<T>;

  if (isCrypto(original) && diff.amount && diff.amount !== original.amount) {
    (diff as unknown as SelectedCryptos[string]).datePurchased = new Date();
  }

  return diff;
};

const sendCryptos = async (
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
  onlyDeviceId?: boolean,
) => {
  try {
    const cryptos = await prisma.cryptos.findMany({
      where: { userId: userDevice.userId },
    });

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
    Logger.error(
      "Failed to fetch cryptos for user:",
      userDevice.userId,
      "error:",
      error instanceof Error ? error.message : error,
    );
  }
};

const handleSyncSettings = async (
  message: CryptosWebSocketMessage<"sentByApp">,
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
) => {
  if (message.type !== "sync-settings") return;
  const userId = userDevice.userId;

  const res = await prisma.cryptosSettings.upsert({
    where: { userId },
    create: {
      userId,
      autoRefresh: { create: {} },
      notifications: { create: {} },
      defaultCurrency: message.settings?.defaultCurrency ?? "USDT",
    },
    update: {
      updatedAt: new Date(),
      defaultCurrency: message.settings?.defaultCurrency,
      autoRefresh: {
        upsert: {
          create: {},
          update: {
            enabled: message.settings?.autoRefresh?.enabled ?? undefined,
            valueMs: message.settings?.autoRefresh?.valueMs ?? undefined,
          },
        },
      },
      notifications: {
        upsert: {
          create: {},
          update: {
            enabled: message.settings?.notifications?.enabled ?? undefined,
            valueMs: message.settings?.notifications?.valueMs ?? undefined,
          },
        },
      },
    },
    include: { notifications: true, autoRefresh: true },
  });

  let existing = users.getAdditionalData("cryptoSettings")?.[userId];

  if (!existing) {
    existing = res;
    users.setAdditionalData("cryptoSettings", (prev) => {
      return { ...prev, [userId]: existing } as typeof prev;
    });
  }

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

  const existingNotifi =
    users.getAdditionalData("cryptoSettings")?.[userId]?.notifications;
  const incomingNotifi = message.settings?.notifications;

  if (!existingNotifi || !incomingNotifi) return;

  if (Object.keys(getDiff(existingNotifi, incomingNotifi)).length > 0) {
    // initUserInterval(userId);
  }
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
    Logger.error(
      "Failed to add crypto for user:",
      userData.userId,
      "crypto:",
      message.crypto,
      "error:",
      error instanceof Error ? error.message : error,
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
    Logger.error(
      "Failed to delete crypto for user:",
      userDevice.userId,
      "symbol:",
      message.symbol,
      "error:",
      error instanceof Error ? error.message : error,
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
      Logger.error("Received message before initialization:", message);
      userDevice.handleClose(4001, "Initialization required");
      return;
    }

    switch (parsedMessage.type) {
      case "init":
        {
          const { userId, deviceId } = parsedMessage;
          if (!userId || !deviceId) {
            Logger.error(
              "Initialization message missing userId or deviceId:",
              message,
            );
            userDevice.handleClose(4002, "Invalid initialization data");
            return;
          }

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
    Logger.error(
      "Failed to parse WebSocket message:",
      error instanceof Error ? error.message : error,
    );
  }
};

const handleConnection = (ws: WebSocket) => {
  const user = users.createUser(ws);

  ws.on("message", (message) => {
    handleMessage(message.toString(), user);
  });
};

export const initWebSocketCryptos = () => {
  const ws = new WebSocketServer({ noServer: true });

  ws.on("connection", handleConnection);

  return ws;
};
