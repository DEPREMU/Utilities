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
} from "@types";
import chalk from "chalk";
import { cryptos } from "../routes/cryptos.ts";
import { showError } from "../functions/logger.ts";
import { SelectedCryptos, t } from "@common";
import { executeFunctionAfterInit } from "../config.ts";
import WebSocket, { WebSocketServer } from "ws";
import { sendFCMNotification } from "../firebase/admin.ts";

type UserData = {
  userId: string;
  deviceId: string;
};

type Users = {
  [userId: string]: {
    notificationInterval?: {
      id: ReturnType<typeof setInterval> | null;
      valueMs: number;
    };
    cryptoSettings: CryptosSettings;
    devices?: {
      [deviceId: string]: {
        ws: WebSocket;
        pingTimeout: ReturnType<typeof setTimeout> | null;
        pingInterval: ReturnType<typeof setInterval> | null;
      };
    };
  };
};

const getDefaultCryptoSettings = (userData: UserData): CryptosSettings => {
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

const users: Users = {};

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

    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (notifi.enabled) {
      intervalId = setInterval(
        () => handleSendNotification(userId),
        settings.notifications.valueMs,
      );
    } else if (users[userId]?.notificationInterval?.id) {
      clearInterval(users[userId].notificationInterval.id);
    }

    users[userId] = {
      ...(users[userId] || {}),
      cryptoSettings: settings,
      notificationInterval: {
        id: intervalId,
        valueMs: settings.notifications.valueMs,
      },
    };
  } catch (error) {
    showError(
      "Failed to initialize user notification interval for WebSocketCryptos:",
      error instanceof Error ? error.message : error,
    );
  }
};

const initUsersInterval = async () => {
  try {
    const users = await fetchFromTable({
      table: "Users",
    });

    if (!users.data) return;

    users.data.forEach((user) => {
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

const sendMessage = (
  message: CryptosWebSocketMessage<"sentByServer">,
  userId: string,
  deviceId?: string,
) => {
  const userDevices = users[userId];
  if (!userDevices) {
    showError(`No devices found for userId: ${userId}`);
    return;
  }

  const msg = JSON.stringify(message);

  if (deviceId) {
    const device = userDevices.devices?.[deviceId];
    if (!device) return;

    if (device.ws.readyState === WebSocket.OPEN) {
      device.ws.send(msg);
    } else {
      handleClose(device.ws, { userId, deviceId });
    }
  } else {
    Object.entries(userDevices.devices || {}).forEach(([deviceId, device]) => {
      if (!device) return;
      const { ws } = device;

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      } else {
        handleClose(ws, { userId, deviceId });
      }
    });
  }
};

const isValidUserData = (data: Record<string, unknown>): data is UserData => {
  return (
    data !== null &&
    typeof data === "object" &&
    typeof data.userId === "string" &&
    typeof data.deviceId === "string"
  );
};

const handleClose = (ws: WebSocket, userData: UserData) => {
  clearTimeouts(userData);

  if (!isValidUserData(userData)) {
    showError("Invalid user data on close:", userData);
    return;
  }

  const { userId, deviceId } = userData;

  if (users[userId] && users[userId].devices?.[deviceId]) {
    delete users[userId].devices[deviceId];
  }

  ws.removeAllListeners();
  ws.close();
};

const clearTimeouts = (userData: UserData, clear?: "interval" | "timeout") => {
  if (!isValidUserData(userData)) {
    showError("Invalid user data for clearing timeouts:", userData);
    return;
  }
  const { userId, deviceId } = userData;

  const device = users[userId]?.devices?.[deviceId];
  if (!device) return;

  if (device.pingTimeout && (!clear || clear === "timeout")) {
    clearTimeout(device.pingTimeout);
    device.pingTimeout = null;
  }

  if (device.pingInterval && (!clear || clear === "interval")) {
    clearInterval(device.pingInterval);
    device.pingInterval = null;
  }
};

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

const sendCryptos = async (userData: UserData, onlyDeviceId?: boolean) => {
  try {
    const { data: cryptos } = await fetchFromTable({
      match: { userId: userData.userId },
      table: "Cryptos",
    });

    sendMessage(
      {
        type: "cryptos",
        cryptos: cryptos ?? [],
      },
      userData.userId,
      ...(onlyDeviceId ? [userData.deviceId] : []),
    );
  } catch (error) {
    showError(
      "Failed to fetch cryptos for user:",
      userData.userId,
      "error:",
      error instanceof Error ? error.message : error,
    );
  }
};

const handleSyncSettings = async (
  message: CryptosWebSocketMessage<"sentByApp">,
  userData: UserData,
) => {
  if (message.type !== "sync-settings") return;

  {
    const msg: CryptosWebSocketMessage<"sentByServer"> = {
      type: "synced",
    };

    for (let i = 0; i < 3; i++) {
      if (users[userData.userId]?.cryptoSettings) break;

      await new Promise((res) => setTimeout(res, 500));
    }

    const existing = users[userData.userId]?.cryptoSettings;

    const existingDate = existing ? new Date(existing.updatedAt).getTime() : 0;
    const incomingDate = message.settings?.updatedAt
      ? new Date(message.settings.updatedAt).getTime()
      : 0;

    if (existingDate > incomingDate) {
      msg.settings = existing;
    } else if (incomingDate > existingDate && message.settings) {
      const diff = getDiff(existing, message.settings);

      if (Object.keys(diff).length >= 0)
        await updateInTable("CryptosSettings", diff);
    }

    sendMessage(msg, userData.userId);

    const existingNotifi =
      users[userData.userId]?.cryptoSettings?.notifications;
    const incomingNotifi = message.settings?.notifications;

    if (!existingNotifi || !incomingNotifi) return;

    if (Object.keys(getDiff(existingNotifi, incomingNotifi)).length > 0) {
      initUserInterval(userData.userId);
    }
  }
};

const handleAddCrypto = async (
  message: CryptosWebSocketMessage<"sentByApp">,
  userData: UserData,
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
  userData: UserData,
) => {
  if (message.type !== "update-crypto") return;

  try {
    const { data: cryptos } = await fetchFromTable({
      match: { userId: userData.userId },
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
      { id: existing.id, userId: userData.userId },
    );
    if (Array.isArray(res.data) && res.data.length === 0) return;

    sendCryptos(userData);
  } catch (error) {
    showError(
      "Failed to update crypto for user:",
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
  userData: UserData,
) => {
  if (message.type !== "delete-crypto") return;

  try {
    const res = await deleteInTable(userData.userId, "Cryptos", {
      symbol: message.symbol,
      userId: userData.userId,
    });

    if (!res.success) return;

    sendCryptos(userData);
  } catch (error) {
    showError(
      "Failed to delete crypto for user:",
      userData.userId,
      "symbol:",
      message.symbol,
      "error:",
      error instanceof Error ? error.message : error,
    );
  }
};

const handleMessage = async (
  ws: WebSocket,
  message: string,
  userData: UserData,
) => {
  try {
    const parsedMessage: CryptosWebSocketMessage<"sentByApp"> =
      JSON.parse(message);

    if (
      parsedMessage.type !== "init" &&
      (!userData.userId || !userData.deviceId)
    ) {
      showError("Received message before initialization:", message);
      ws.close(4001, "Initialization required");
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
            ws.close(4002, "Invalid initialization data");
            return;
          }

          userData.userId = userId;
          userData.deviceId = deviceId;
          clearTimeouts(userData);

          const pingInterval = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN)
              return handleClose(ws, userData);

            const device = users[userId]?.devices?.[deviceId];
            if (!device) {
              handleClose(ws, userData);
              clearInterval(pingInterval);
              return;
            }

            sendMessage({ type: "ping" }, userId, deviceId);
            device.pingTimeout = setTimeout(
              () => handleClose(ws, userData),
              10000,
            );
          }, 30000);

          const device = users[userId]?.devices?.[deviceId];
          if (device && device.ws !== ws) device.ws.terminate();

          const { data: settings } = await fetchFromTable({
            table: "CryptosSettings",
            match: { userId: userData.userId },
          });

          users[userId] = {
            ...(users[userId] || {}),
            cryptoSettings:
              settings?.[0] ??
              users[userId]?.cryptoSettings ??
              getDefaultCryptoSettings(userData),
          };

          users[userId].devices = {
            ...(users[userId].devices || {}),
            [deviceId]: {
              ws,
              pingInterval,
              pingTimeout: null,
            },
          };

          sendMessage({ type: "init-success" }, userId, deviceId);
        }
        break;

      case "sync-settings":
        handleSyncSettings(parsedMessage, userData);
        break;
      case "pong":
        clearTimeouts(userData, "timeout");
        break;
      case "add-crypto":
        handleAddCrypto(parsedMessage, userData);
        break;
      case "update-crypto":
        handleUpdateCrypto(parsedMessage, userData);
        break;
      case "delete-crypto":
        handleDeleteCrypto(parsedMessage, userData);
        break;
      case "get-cryptos":
        sendCryptos(userData, true);
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
  const userData = {
    userId: "",
    deviceId: "",
  };

  ws.on("message", (message) => {
    handleMessage(ws, message.toString(), userData);
  });
};

export const initWebSocketCryptos = () => {
  const ws = new WebSocketServer({ noServer: true });

  ws.on("connection", handleConnection);

  return ws;
};
