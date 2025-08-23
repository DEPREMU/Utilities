import type {
  Cryptos,
  Notifications,
  WebSocketMessage,
  ReasonNotification,
  WebSocketResponse,
  LanguagesSupported,
} from "./../../types/index";
import { supabase } from "../supabase/supabase.ts";
import { Server as ServerHTTP } from "http";
import { Server as ServerHTTPS } from "https";
import WebSocket, { WebSocketServer } from "ws";
import env from "../env.ts";
import { t } from "../translations/index.ts";

let credentials = await supabase.auth.signInWithPassword({
  email: env.EMAIL_APP_SUPABASE,
  password: env.PASSWORD_APP_SUPABASE,
});

const users: Record<
  string,
  {
    ws: WebSocket;
    notifications: Notifications | null;
    language: LanguagesSupported;
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

const handleInitWebSocket = (data: WebSocketMessage, ws: WebSocket): string => {
  if (data.type !== "init") return "";

  if (!users[data.uid]) {
    users[data.uid] = {
      ws,
      notifications: data.notifications,
      language: data.language || "en",
      intervalsId: null,
    };
  }
  users[data.uid].notifications = data.notifications;
  users[data.uid].language = data.language || "en";
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

const connectionWss = (ws: WebSocket) => {
  const getNotificationCrypto = async (
    cryptos: Cryptos[],
  ): Promise<{
    body: string;
    title: string;
    reason: "cryptos";
    screen: "Cryptos";
  }> => {
    const lang = users?.[userId]?.language || "en";

    if (cryptos?.length === 0)
      return {
        title: t("notificationNotCryptosSelectedTitle", lang),
        body: t("notificationNotCryptosSelectedBody", lang),
        reason: "cryptos",
        screen: "Cryptos",
      };

    const res = await fetch(`https://api.binance.com/api/v3/ticker/price`);
    const data = await res.json();
    const prices = cryptos.map((crypto) => {
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
        t("notificationCryptoBody", lang, {
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
      title: t("notificationCryptoTitle", lang, {
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

    if (!users[data.uid] || !users[data.uid].notifications) {
      users[data.uid] = {
        ws,
        notifications: { ...data.data },
        language: "en",
        intervalsId: null,
      };
    }
    const { data: dataSupabase } = await supabase
      .from("Cryptos")
      .select("*")
      .eq("userId", data.uid);
    const cryptos = dataSupabase as Cryptos[];

    const handleInterval = async () => {
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
    };
  };

  const handleNotifications = (data: WebSocketMessage, ws: WebSocket) => {
    if (data.type !== "notifications") return;

    if (!users[data.uid]) {
      users[data.uid] = {
        ws,
        notifications: { ...data.data },
        language: "en",
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
        users[userId].language = data.language;
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
