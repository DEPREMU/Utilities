/* eslint-disable indent */
import {
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../supabase/functions.ts";
import type {
  Cryptos,
  UserConfig,
  Notifications,
  WebSocketMessage,
  ReasonNotification,
  WebSocketResponse,
  LanguagesSupported,
  UserNotificationsConfig,
} from "./../../types/index";
import env from "../env.ts";
import { t } from "../translations/index.ts";
import chalk from "chalk";
import { supabase } from "../supabase/supabase.ts";
import { Server as ServerHTTP } from "http";
import { Server as ServerHTTPS } from "https";
import WebSocket, { WebSocketServer } from "ws";

const credentials = await supabase.auth.signInWithPassword({
  email: env.EMAIL_APP_SUPABASE,
  password: env.PASSWORD_APP_SUPABASE,
});

const users: Record<
  string,
  {
    ws: WebSocket;
    intervalsId: Record<
      ReasonNotification,
      NodeJS.Timeout | number | null
    > | null;
  }
> = {};

setInterval(
  async () => {
    const { data } = await supabase.auth.refreshSession({
      refresh_token: credentials.data.session?.refresh_token || "",
    });
    credentials.data.session = data.session;
  },
  50 * 60 * 1000,
);

const getPercentGain = (priceUsd: number, cryptoData: Cryptos) => {
  if (!cryptoData.firstPricePurchased) return "0%";
  const percentage =
    ((priceUsd - cryptoData.firstPricePurchased) /
      cryptoData.firstPricePurchased) *
    100;

  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
};

const insertUserConfig = async (config: UserConfig) => {
  const fetchedData = await fetchFromTable("UserConfig", {
    userId: config.userId,
  });
  let data = fetchedData.data;
  if (Array.isArray(data)) data = null;

  if (!data) return await insertIntoTable("UserConfig", config);
  updateInTable("UserConfig", { id: data.id }, { id: data.id });
};

const handleInitWebSocket = (data: WebSocketMessage, ws: WebSocket): string => {
  if (data.type !== "init") return "";

  if (!users[data.userId]) {
    users[data.userId] = {
      ws,
      intervalsId: null,
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
};

const insertNotifications = async (
  userId: string,
  notifications: Notifications | null,
) => {
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
};

const connectionWss = (ws: WebSocket) => {
  const getNotificationCrypto = async (
    cryptos: Cryptos[],
  ): Promise<{
    body: string;
    title: string;
    reason: "cryptos";
    screen: "Cryptos";
  }> => {
    const fetchedData = await fetchFromTable("UserConfig", {
      userId,
    });

    let dataLang = fetchedData.data;
    if (Array.isArray(dataLang)) dataLang = dataLang[0];
    const language = (dataLang?.language || "en") as LanguagesSupported;

    if (!cryptos || cryptos?.length === 0)
      return {
        title: t("notificationNotCryptosSelectedTitle", language),
        body: t("notificationNotCryptosSelectedBody", language),
        reason: "cryptos",
        screen: "Cryptos",
      };

    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    const data = await res.json();
    const prices = cryptos?.map((crypto) => {
      const priceData = data.find(
        (item: { symbol: string; price: number }) =>
          item.symbol === `${crypto.id}${crypto.currency}`,
      );
      return priceData ? priceData.price : 0;
    });
    const percentageGains = prices.map((price, index) =>
      getPercentGain(price, cryptos[index]),
    );
    const body = cryptos
      .map((crypto, index) =>
        t("notificationCryptoBody", language, {
          crypto: crypto.id,
          price: prices[index],
          gainPercent: percentageGains[index],
        }),
      )
      .join("\n");

    return {
      body,
      reason: "cryptos",
      screen: "Cryptos",
      title: t("notificationCryptoTitle", language, {
        cryptos: cryptos.map((crypto) => crypto.id).join(", "),
      }),
    };
  };

  const handleNotificationCrypto = async (
    data: WebSocketMessage,
    ws: WebSocket,
    interval: number,
  ) => {
    if (data.type !== "notifications") return;

    if (!users[data.userId]) {
      users[data.userId] = {
        ws,
        intervalsId: null,
      };
    }
    const fetchedData = await fetchFromTable("Cryptos", {
      userId: data.userId,
    });
    let cryptos = fetchedData.data;
    if (!cryptos) cryptos = [];
    if (!Array.isArray(cryptos)) cryptos = [cryptos];

    const handleInterval = async () => {
      if (!cryptos || cryptos.length === 0) return;
      const notification = await getNotificationCrypto(cryptos);
      const message: WebSocketResponse = {
        type: "notification",
        notification,
      };

      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    };

    const intervalOld = users[data.userId].intervalsId?.cryptos;
    if (intervalOld) clearInterval(intervalOld);
    const intervalId = setInterval(handleInterval, interval);
    users[data.userId].intervalsId = {
      ...users[data.userId].intervalsId,
      cryptos: intervalId,
      streamers: null,
      allNotifications: null,
    };
  };

  const handleNotifications = (data: WebSocketMessage, ws: WebSocket) => {
    if (data.type !== "notifications") return;

    insertNotifications(data.userId, data.data);

    if (!users[data.userId]) {
      users[data.userId] = {
        ws,
        intervalsId: null,
      };
    }
    if (!data.data.enabled.allNotifications) return;
    Object.entries(data.data.enabled).forEach(([key, value]) => {
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
    });
  };

  let userId: string;
  console.log(chalk.green("New client connected"));

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString()) as WebSocketMessage;
    switch (data.type) {
      case "init":
        userId = handleInitWebSocket(data, ws);
        break;
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      case "notifications":
        handleNotifications(data, ws);
        break;
      case "language-change":
        if (!users[userId]) return;
        updateInTable("UserConfig", { language: data.language }, { userId });
        break;
      default:
        console.log(chalk.yellow("Unknown message type:"), data);
        break;
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
};

export const initWebSocket = (server: ServerHTTP | ServerHTTPS) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", connectionWss);
};
