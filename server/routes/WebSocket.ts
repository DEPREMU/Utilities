import type {
  Cryptos,
  Notifications,
  WebSocketMessage,
  ReasonNotification,
  WebSocketResponse,
} from "./../../types/index";
import { supabase } from "../supabase/supabase.ts";
import { Server as ServerHTTP } from "http";
import { Server as ServerHTTPS } from "https";
import WebSocket, { WebSocketServer } from "ws";
import env from "../env.ts";

let credentials = await supabase.auth.signInWithPassword({
  email: env.EMAIL_APP_SUPABASE,
  password: env.PASSWORD_APP_SUPABASE,
});

const users: Record<
  string,
  {
    ws: WebSocket;
    notifications: Notifications | null;
    language: string;
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

const getTitleCryptos = (cryptos: Cryptos[]) => {
  return `Crypto Update: ${cryptos.map((crypto) => crypto.id).join(", ")}`;
};

const getPercentajeGain = (priceUsd: number, cryptoData: Cryptos) =>
  (
    ((priceUsd - cryptoData.firstPricePurchased) /
      cryptoData.firstPricePurchased) *
    100
  ).toFixed(2) + "%";

const getBodyCryptos = async (cryptos: Cryptos[]) => {
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
    getPercentajeGain(price, cryptos[index]),
  );
  return cryptos
    .map(
      (crypto, index) =>
        `Current price of ${crypto.id} is ${prices[index]} ${percentageGains[index]}`,
    )
    .join("\n");
};

const handleNotificationCrypto = async (
  data: WebSocketMessage,
  ws: WebSocket,
  interval: number,
) => {
  console.log("Setting up crypto notification...");
  if (data.type !== "notifications") return;

  if (!users[data.uid] || !users[data.uid].notifications) {
    users[data.uid] = {
      ws,
      notifications: { ...data.data },
      language: "en",
      intervalsId: null,
    };
  }
  if (users[data.uid].intervalsId?.cryptos)
    clearInterval(users[data.uid]?.intervalsId?.cryptos || 0);
  const { data: dataSupabase } = await supabase
    .from("Cryptos")
    .select("*")
    .eq("userId", data.uid);
  const cryptos = dataSupabase as Cryptos[];

  const handleInterval = async () => {
    const message: WebSocketResponse = {
      type: "notification",
      notification: {
        reason: "cryptos",
        title: getTitleCryptos(cryptos),
        body: await getBodyCryptos(cryptos),
        screen: "Cryptos",
      },
    };

    ws.send(JSON.stringify(message));
  };

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

export const initWebSocket = (server: ServerHTTP | ServerHTTPS) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
      const data = JSON.parse(message.toString()) as WebSocketMessage;
      console.log("Received message:", data);
      switch (data.type) {
        case "init":
          users[data.uid] = {
            ws: ws,
            notifications: null,
            language: data.language,
            intervalsId: null,
          };
          break;
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
        case "notifications":
          handleNotifications(data, ws);
          break;
      }
    });

    ws.on("close", (code, reason) => {
      console.log("Client disconnected:", code, reason);
    });
  });
};
