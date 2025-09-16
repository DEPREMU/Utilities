import type { UserData } from "./typesUser";
import type { Logs, Streamer } from "./typesDatabase";
import type { Handler } from "express";

export type Route = {
  method: "get" | "post" | "put" | "delete";
  middlewares?: any[];
  handler: Handler;
};

export type Coin = {
  id: string;
  name: string;
  symbol: string;
};

export type RoutesAPI =
  | "/decrypt"
  | "/encrypt"
  | "/cryptoPrice"
  | "/addStreamer"
  | "/cryptos"
  | "/getIsLiveStreamer"
  | "/translate"
  | "/health";

export type RequestBody = Logs | UserData;

export type PriceBinanceAPI = {
  symbol: string;
  price: number;
}[];

export type ResponseHealth = {
  status: "running";
  timestamp: string;
};

export type ResponseCryptoPrice = {
  priceUSD?: number;
  priceUSDTMXN?: number;
  error?: string;
};
export type RequestCryptoPrice = {
  cryptoId: string;
  currency: string;
};

export type RequestCryptos = {
  currency?: string;
};

export type ResponseCryptos = {
  cryptos?: PriceBinanceAPI;
  error?: string;
};

export type RequestTranslate = {
  text: string;
  targetLang: string;
};

export type ResponseTranslate = {
  translatedText?: string;
  error?: string;
};

export type RequestAddStreamer = {
  name: string;
  userId: string;
};

export type ResponseAddStreamer = {
  success?: boolean;
  streamer?: (Streamer & { isLive: boolean }) | null;
  error?: string;
};

export type RequestGetIsLiveStreamer = {
  streamer: Streamer;
};

export type ResponseGetIsLiveStreamer = {
  streamer?: Streamer & { isLive: boolean };
  error?: string;
};
