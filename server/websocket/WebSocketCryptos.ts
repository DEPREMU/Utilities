import {
  deleteInTable,
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import {
  Crypto,
  Notification,
  CryptosSettings,
  LanguagesSupported,
  CryptosWebSocketMessage,
  CommonUserDataWS,
} from "@types";
import chalk from "chalk";
import { Users } from "./WebSocketHandling.ts";
import { cryptos } from "../routes/cryptos.ts";
import { showError } from "../functions/logger.ts";
import { SelectedCryptos, t } from "@common";
import { sendFCMNotification } from "../firebase/admin.ts";
import { executeFunctionAfterInit } from "../config.ts";
import WebSocket, { WebSocketServer } from "ws";

const users = new Users<
  {
    cryptoSettings?: {
      [userId: string]: CryptosSettings;
    };
  },
  CryptosWebSocketMessage<"sentByServer">
>();

const getDefaultCryptoSettings = (
  userData: CommonUserDataWS,
): CryptosSettings => {
  const now = new Date().toISOString();

  return {
    userId: userData.userId,
    defaultCurrency: "USDT",
    autoRefresh: {
      valueMs: 60000,
      enabled: false,
    },
    notifications: {
      valueMs: 3600000,
      enabled: false,
    },
    updatedAt: now,
    createdAt: now,
  };
};

const getPercentGain = (price: number, cryptoData: Crypto) => {
  if (!cryptoData.firstPricePurchased) return "0%";
  const percentage =
    ((price - cryptoData.firstPricePurchased) /
      cryptoData.firstPricePurchased) *
    100;

  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
};

const getNotificationCrypto = async (
  userCryptos: Crypto[],
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
    showError(
      chalk.red("Error in getNotificationCrypto:"),
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

const handleSendNotification = async (userId: string) => {
  const [cryptos, userConfig, pushTokens] = await Promise.all([
    fetchFromTable({
      table: "Cryptos",
      match: { userId },
    }),
    fetchFromTable({
      table: "UserConfig",
      match: { userId },
    }),
    fetchFromTable({
      table: "PushTokens",
      match: { userId },
    }),
  ]);

  const cryptosData = cryptos.data;
  const config = userConfig.data?.[0];
  const tokens = pushTokens.data
    ?.map((t) => t.token)
    .filter((t): t is string => !t.startsWith("expo"));

  if (!config) return;
  if (!tokens?.length) return;
  if (!cryptosData?.length) return;

  const notification = await getNotificationCrypto(
    cryptosData,
    config.language,
  );
  if (!notification) return;

  sendFCMNotification(
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
    const [notification, userSettings] = await Promise.all([
      fetchFromTable({
        table: "UserNotificationsConfig",
        match: { userId, reason: "cryptos" },
      }),
      fetchFromTable({
        table: "CryptosSettings",
        match: { userId },
      }),
    ]);

    let settings = userSettings.data?.[0];

    if (!settings) {
      settings = getDefaultCryptoSettings({ userId, deviceId: "" });
      const res = await insertIntoTable("CryptosSettings", settings);
      if (res.data && res.data.length > 0) {
        settings = res.data[0];
      }
    }

    if (!notification.data || notification.data.length === 0) return;
    if (!settings) return;

    const notifi = notification.data[0];
    const id = "notification-interval-" + userId;

    if (notifi.enabled) {
      users.setInterval(
        () => handleSendNotification(userId),
        settings.notifications.valueMs,
        id,
      );
    } else {
      users.clearInterval(id);
    }
  } catch (error) {
    showError(
      "Failed to initialize user notification interval for WebSocketCryptos:",
      error instanceof Error ? error.message : error,
    );
  }
};

const initUsersInterval = async () => {
  try {
    const { data } = await fetchFromTable({
      table: "Users",
    });

    if (!data) return;

    data.forEach((user) => {
      if (!user.userId) return;

      initUserInterval(user.userId);
    });
  } catch (error) {
    showError(
      "Failed to initialize users notifications for WebSocketCryptos:",
      error instanceof Error ? error.message : error,
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
    (diff as unknown as SelectedCryptos[string]).datePurchased =
      new Date().toISOString();
  }

  return diff;
};

const sendCryptos = async (
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
  onlyDeviceId?: boolean,
) => {
  try {
    const { data: cryptos } = await fetchFromTable({
      match: { userId: userDevice.userId },
      table: "Cryptos",
    });

    if (onlyDeviceId) {
      userDevice.sendMessage({
        type: "cryptos",
        cryptos: cryptos ?? [],
      });
      return;
    }

    users.setTimeout(
      () => {
        users.sendMessageToUser(
          {
            type: "cryptos",
            cryptos: cryptos ?? [],
          },
          userDevice.userId,
        );
      },
      500,
      "send-cryptos-timeout-" + userDevice.userId,
    );
  } catch (error) {
    showError(
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

  let existing = users.getAdditionalData("cryptoSettings")?.[userId];

  if (!existing) {
    const { data } = await fetchFromTable({
      table: "CryptosSettings",
      match: { userId },
    });

    existing =
      data?.[0] ??
      getDefaultCryptoSettings({ userId, deviceId: userDevice.deviceId });

    users.setAdditionalData("cryptoSettings", (prev) => {
      return { ...prev, [userId]: existing } as typeof prev;
    });
  }

  const existingDate = new Date(existing.updatedAt).getTime();
  const incomingDate = message.settings?.updatedAt
    ? new Date(message.settings.updatedAt).getTime()
    : 0;

  if (existingDate > incomingDate) {
    message.settings = existing;
  } else if (incomingDate > existingDate && message.settings) {
    const diff = getDiff(existing, message.settings);

    if (Object.keys(diff).length >= 0)
      await updateInTable("CryptosSettings", diff);
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
    const { data: cryptos } = await fetchFromTable({
      match: { userId: userData.userId },
      table: "Cryptos",
    });
    const existing = cryptos?.find((c) => c.symbol === message.crypto.symbol);

    let success = false;

    if (existing) {
      const dif = getDiff(existing, message.crypto);

      if (Object.keys(dif).length === 0) return;

      const res = await updateInTable(
        "Cryptos",
        {
          ...dif,
          datePurchased:
            dif.amount === existing.amount
              ? existing.datePurchased
              : new Date().toISOString(),
        },
        { id: existing.id, userId: userData.userId },
      );

      success = Array.isArray(res.data) && res.data.length > 0;
    } else {
      const res = await insertIntoTable("Cryptos", {
        userId: userData.userId,
        symbol: message.crypto.symbol,
        amount: message.crypto.amount,
        baseCoin: message.crypto.baseCoin,
        quoteCoin: message.crypto.quoteCoin,
        datePurchased: new Date().toISOString(),
        firstPricePurchased: message.crypto.firstPricePurchased,
      });
      success = Array.isArray(res.data) && res.data.length > 0;
    }

    if (success) sendCryptos(userData);
  } catch (error) {
    showError(
      "Failed to add crypto for user:",
      userData.userId,
      "crypto:",
      message.crypto,
      "error:",
      error instanceof Error ? error.message : error,
    );
  }
};

const handleUpdateCrypto = async (
  message: CryptosWebSocketMessage<"sentByApp">,
  userDevice: NonNullable<ReturnType<typeof users.getUser>>,
) => {
  if (message.type !== "update-crypto") return;

  try {
    const { data: cryptos } = await fetchFromTable({
      match: { userId: userDevice.userId },
      table: "Cryptos",
    });

    const existing = cryptos?.find((c) => c.symbol === message.crypto.symbol);
    if (!existing) return;

    const dif = getDiff(existing, message.crypto);

    if (Object.keys(dif).length === 0) return;

    const res = await updateInTable(
      "Cryptos",
      {
        ...dif,
        datePurchased:
          dif.amount === existing.amount
            ? existing.datePurchased
            : new Date().toISOString(),
      },
      { id: existing.id, userId: userDevice.userId },
    );
    if (Array.isArray(res.data) && res.data.length === 0) return;

    sendCryptos(userDevice);
  } catch (error) {
    showError(
      "Failed to update crypto for user:",
      userDevice.userId,
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
    const res = await deleteInTable(userDevice.userId, "Cryptos", {
      symbol: message.symbol,
      userId: userDevice.userId,
    });

    if (!res.success) return;

    sendCryptos(userDevice);
  } catch (error) {
    showError(
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
      showError("Received message before initialization:", message);
      userDevice.handleClose(4001, "Initialization required");
      return;
    }

    switch (parsedMessage.type) {
      case "init":
        {
          const { userId, deviceId } = parsedMessage;
          if (!userId || !deviceId) {
            showError(
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
        handleUpdateCrypto(parsedMessage, userDevice);
        break;
      case "delete-crypto":
        handleDeleteCrypto(parsedMessage, userDevice);
        break;
      case "get-cryptos":
        sendCryptos(userDevice, true);
        break;
    }
  } catch (error) {
    showError(
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
