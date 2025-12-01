import { Falsy } from "react-native";
import { Streamer, Tables, TablesKeys, UserData } from "../database";
import { ExpectedStorageTypes, PriceBinanceAPI } from "./typesAPI";

export type ResponseHealth = {
  status: "running";
  timestamp: string;
  uptime: number;
};

export type ResponseDatabaseFetch<T extends TablesKeys> = {
  data?: Tables[T][] | Falsy;
  error?: string;
};
export type ResponseDatabaseInsert<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T][] | null;
  error?: string;
  success: boolean;
};

export type ResponseSignOut = {
  success: boolean;
  error?: string;
};
export type ResponseRefreshSession = {
  token?: string;
  error?: string;
  success: boolean;
  userData?: Omit<UserData, "password"> | null;
};

export type ResponseCryptoPrice = {
  priceUSD?: number;
  priceUSDTMXN?: number;
  error?: string;
};

export type ResponseCryptos = {
  cryptos?: PriceBinanceAPI;
  error?: string;
};

export type ResponseTranslate = {
  translatedText?: string;
  error?: string;
};

export type ResponseAddStreamer = {
  success?: boolean;
  streamer?: (Streamer & { isLive: boolean }) | null;
  error?: string;
};

export type ResponseGetIsLiveStreamer = {
  streamer?: Streamer & { isLive: boolean };
  error?: string;
};

export type ResponseAuth = {
  user?: Omit<UserData, "password">;
  token?: string;
  error?: string;
  success: boolean;
  storageValues?: ExpectedStorageTypes<"BOTH">;
};

export type ResponseDatabaseDelete = {
  success: boolean;
  error?: string;
};

export type ResponseGetRandomUUID = {
  uuid?: string;
  error?: string;
};
export type ResponseDatabaseUpdate<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T][] | Falsy;
  error?: string;
  success: boolean;
};

export type ResponseLogs = {
  success: boolean;
};

export type ResponseDoQuery = {
  result?: unknown | null;
  error?: string;
};

export type ResponseDecrypt = {
  decryptedValue?: string;
  timestamp: string;
  error?: string;
};

export type ResponseEncrypt = {
  dataEncrypted?: string;
  timestamp: string;
  error?: string;
};

export type ResponseIsUpdateAvailable = {
  updateAvailable: boolean;
  latestVersion: string;
  downloadUrl: string;
};
