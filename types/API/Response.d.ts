import type { Falsy } from "react-native";
import { RequestChangeImageFormat } from "./Request";
import { Streamer, Tables, TablesKeys, UserData } from "../database";
import type { PriceBinanceAPI, ExpectedStorageTypes } from "@common";

export { Falsy };

export type ResponseHealth = {
  uptime: number;
  status: "running";
  timestamp: string;
  uptimeString: string;
};

export type ResponseDatabaseFetch<T extends TablesKeys> = {
  data?: Tables[T][];
  error?: string;
  success: boolean;
};
export type ResponseDatabaseInsert<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T][] | null;
  error?: string;
  success: boolean;
};

export type ResponseSignOut = {
  error?: string;
  success: boolean;
};

export type ResponseCryptoPrice = {
  error?: string;
  price?: number;
  success: boolean;
  priceMXN?: number;
};

export type ResponseCryptos = {
  error?: string;
  success: boolean;
  cryptos?: PriceBinanceAPI;
};

export type ResponseTranslate = {
  error?: string;
  success: boolean;
  translatedText?: string;
};

export type ResponseAddStreamer = {
  error?: string;
  success?: boolean;
  streamer?: (Streamer & { isLive: boolean }) | null;
};

export type ResponseGetIsLiveStreamer = {
  error?: string;
  success: boolean;
  streamer?: Streamer & { isLive: boolean };
};

export type ResponseAuth<T extends "login" | "signup"> = T extends "login"
  ? {
      user?: Omit<UserData, "password">;
      token?: string;
      error?: string;
      success: boolean;
      storageValues?: Partial<ExpectedStorageTypes<"BOTH">>;
    }
  : {
      error?: string;
      success: boolean;
    };

export type ResponseDatabaseDelete = {
  error?: string;
  success: boolean;
};

export type ResponseGetRandomUUID = {
  uuid?: string;
  error?: string;
  success: boolean;
};
export type ResponseDatabaseUpdate<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T][] | Falsy;
  error?: string;
  success: boolean;
};

export type ResponseLogs = {
  error?: string;
  success: boolean;
};

export type ResponseDoQuery = {
  result?: {
    rowCount: number;
    rows: unknown[];
    command: string;
    fields?: unknown[];
  };
  error?: string;
  success: boolean;
};

export type ResponseDecrypt = {
  error?: string;
  success: boolean;
  decryptedValue?: string;
};

export type ResponseEncrypt = {
  error?: string;
  success: boolean;
  dataEncrypted?: string;
};

export type ResponseIsUpdateAvailable = {
  success: boolean;
  downloadUrl: string;
  latestVersion: string;
  updateAvailable: boolean;
};

export type ResponseUploadUpdate = {
  error?: string;
  success: boolean;
};

export type ResponseChangeImageFormat = {
  error?: string;
  success: boolean;
  imageUri?: string;
  newFormat?: RequestChangeImageFormat["format"];
};

export type ResponseDebugAppAlive = {
  success: boolean;
  timestamp: string;
};
