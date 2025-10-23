import { Falsy } from "react-native";
import type { UserData } from "./typesUser";
import type {
  Logs,
  Streamer,
  Tables,
  TablesKeys,
  UserConfig,
} from "./typesDatabase";
import type { Handler } from "express";
import { LanguagesSupported } from "./typesTranslations";
import { ExpectedStorageTypes } from "@/utils";

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
  | "/supabase/update"
  | "/supabase/delete"
  | "/supabase/fetch"
  | "/supabase/insert"
  | "/auth/login"
  | "/auth/signup"
  | "/auth/signOut"
  | "/auth/refreshSession"
  | "/getRandomUUID"
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

export type RequestAuth = {
  lang: LanguagesSupported;
  email: string;
  password: string;
  // Login:
  deviceId?: string;
  expoToken?: string;
  rememberMe?: boolean;
};

export type ResponseAuth = {
  user?: Omit<UserData, "password">;
  token?: string;
  error?: string;
  success: boolean;
  storageValues?: ExpectedStorageTypes<"BOTH">;
};

export type RequestRefreshSession = {
  lang: LanguagesSupported;
  deviceId: string;
  expoToken: string;
};

export type ResponseRefreshSession = {
  token?: string;
  error?: string;
  success: boolean;
  userData?: Omit<UserData, "password"> | null;
};

export type RequestSignOut = {
  lang: LanguagesSupported;
  deviceId: string;
  expoToken: string;
};

export type ResponseSignOut = {
  success: boolean;
  error?: string;
};

export type RequestSupabaseInsert<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  values: T extends "Users" ? Partial<Tables[T]> : Tables[T] | Tables[T][];
};

export type ResponseSupabaseInsert<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T] | Tables[T][] | null;
  error?: string;
  success: boolean;
};

export type RequestSupabaseFetch<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match: Partial<Tables[T]> | null;
};

export type ResponseSupabaseFetch<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T][] | Tables[T] | Falsy;
  error?: string;
};

export type RequestSupabaseUpdate<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match: Partial<Tables[T]> | null;
  values: Partial<Tables[T]> | Partial<Tables[T]>[];
};

export type ResponseSupabaseUpdate<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T] | Tables[T][] | Falsy;
  error?: string;
  success: boolean;
};

export type RequestSupabaseDelete<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match: Partial<Tables[T]>;
};

export type ResponseSupabaseDelete = {
  success: boolean;
  error?: string;
};

export type ResponseGetRandomUUID = {
  uuid?: string;
  error?: string;
};
