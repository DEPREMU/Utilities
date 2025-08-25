/* eslint-disable indent */
import type {
  Cryptos,
  Notifications,
  WebSocketMessage,
  ReasonNotification,
  WebSocketResponse,
  LanguagesSupported,
  UserNotificationsConfig,
  UserConfig,
} from "./../../types/index";
import { supabase } from "../supabase/supabase.ts";
import { Server as ServerHTTP } from "http";
import { Server as ServerHTTPS } from "https";
import WebSocket, { WebSocketServer } from "ws";
import env from "../env.ts";
import { t } from "../translations/index.ts";

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
  60 * 60 * 1000,
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
  const { data } = await supabase
    .from("UserConfig")
    .select("*")
    .eq("userId", config.userId)
    .single();

  if (!data) return await supabase.from("UserConfig").insert(config);
  await supabase
    .from("UserConfig")
    .update({ ...config, id: data.id })
    .eq("id", data.id);
};

const handleInitWebSocket = (data: WebSocketMessage, ws: WebSocket): string => {
  if (data.type !== "init") return "";

  if (!users[data.uid]) {
    users[data.uid] = {
      ws,
      intervalsId: null,
    };
  }
  insertNotifications(data.uid, data.notifications || null);
  insertUserConfig({
    userId: data.uid,
    language: data.language || "en",
    hasAdmin: data.hasAdmin || false,
    updatedAt: new Date().toISOString(),
  });

  if (users[data.uid].ws !== ws) {
    if (users[data.uid].ws.readyState === WebSocket.OPEN) {
      users[data.uid].ws.close();
    }
    users[data.uid].ws = ws;
  }

  const message: WebSocketResponse = {
    type: "init-success",
    message: "WebSocket initialized successfully",
  };
  ws.send(JSON.stringify(message));

  return data.uid;
};

const insertNotifications = async (
  userId: string,
  notifications: Notifications | null,
) => {
  const { data } = await supabase
    .from("UserNotificationsConfig")
    .select("*")
    .eq("userId", userId);

  if (data)
    return data.forEach(async (item: UserNotificationsConfig) => {
      const newData: UserNotificationsConfig = {
        ...item,
        enabled: notifications?.enabled?.[item.reason] || false,
        interval: notifications?.intervals?.[item.reason] || -1,
        updatedAt: new Date().toISOString(),
      };

      await supabase
        .from("UserNotificationsConfig")
        .update(newData)
        .eq("id", item.id);
    });

  if (!notifications) return;

  const arrEnabled: UserNotificationsConfig[] = Object.entries(
    notifications.enabled,
  )
    .filter(([, value]) => value)
    .map(([reason, enabled]) => ({
      userId,
      reason: reason as ReasonNotification,
      enabled,
      interval: notifications.intervals[reason as ReasonNotification] || -1,
      updatedAt: new Date().toISOString(),
    }));

  const { error: errorInsert } = await supabase
    .from("UserNotificationsConfig")
    .insert(arrEnabled);

  if (errorInsert) {
    console.error("Error inserting user notifications:", errorInsert);
  }
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
    const { data: lang } = await supabase
      .from("UserConfig")
      .select<"language", { language: LanguagesSupported }>("language")
      .eq("userId", userId)
      .single();

    const { language } = lang || { language: "en" };

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

    if (!users[data.uid]) {
      users[data.uid] = {
        ws,
        intervalsId: null,
      };
    }
    const { data: dataSupabase } = await supabase
      .from("Cryptos")
      .select("*")
      .eq("userId", data.uid);
    const cryptos = dataSupabase as Cryptos[];

    const handleInterval = async () => {
      if (!cryptos || cryptos.length === 0) return;
      const notification = await getNotificationCrypto(cryptos);
      const message: WebSocketResponse = {
        type: "notification",
        notification,
      };

      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    };

    const intervalOld = users[data.uid].intervalsId?.cryptos;
    if (intervalOld) clearInterval(intervalOld);
    const intervalId = setInterval(handleInterval, interval);
    users[data.uid].intervalsId = {
      ...users[data.uid].intervalsId,
      cryptos: intervalId,
      allNotifications: null,
    };
  };

  const handleNotifications = (data: WebSocketMessage, ws: WebSocket) => {
    if (data.type !== "notifications") return;

    insertNotifications(data.uid, data.data);

    if (!users[data.uid]) {
      users[data.uid] = {
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
  console.log("New client connected");

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
        supabase
          .from("Users")
          .update({ language: data.language })
          .eq("id", userId);
        break;
      default:
        console.log("Unknown message type:", data);
        break;
    }
  });

  ws.on("close", (code, reason) => {
    console.log("Client", userId, "disconnected:", code, reason.toString());
  });
};

export const initWebSocket = (server: ServerHTTP | ServerHTTPS) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", connectionWss);
};
