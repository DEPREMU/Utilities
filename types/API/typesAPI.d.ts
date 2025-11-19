import type {
  Logs,
  Tables,
  Cryptos,
  Streamer,
  UserData,
  TablesKeys,
  DownDetector,
} from "../database";
import type { Falsy } from "react-native";
import type { Handler } from "express";
import { Notifications } from "../typesNotifications";
import { SerializableTask } from "../typesTaskRegistry";
import type { LanguagesSupported } from "../typesTranslations";

export type Command = {
  when: "Start-up" | "Shut-down";
  command: string;
};

export type SelectedCryptos = Record<string, Cryptos>;

export type ExpectedSecureStorageTypes = {
  _deviceId: string;
  _userData: Omit<UserData, "password"> | null;
  _Streamers: (Streamer & { isLive: boolean })[] | null;
  _sessionExpiry: number | -1;
  _selectedCryptos: SelectedCryptos | null;
  _lastUpdateCheck: number | null;
  _terminalCommands: Command[] | null;
  _downDetectorData: DownDetector[] | null;
  _userSessionTokenStorage: string | null;
};

export type ExpectedUnsecureStorageTypes = {
  "@theme": "light" | "dark" | "auto";
  "@API_URL": string | null;
  "@pendingTasks": SerializableTask[] | null;
  "@webSocketURL": string | null;
  "@notifications": Notifications;
  "@hasAdminAccess": boolean | null;
  "@languageKeyStorage": LanguagesSupported;
  "@clipboardWebSocketURL": string | null;
};

export type ExpectedStorageTypes<
  T extends "SECURE" | "UNSECURE" | "BOTH" = "SECURE"
> = T extends "BOTH"
  ? ExpectedSecureStorageTypes & ExpectedUnsecureStorageTypes
  : T extends "SECURE"
  ? ExpectedSecureStorageTypes
  : ExpectedUnsecureStorageTypes;

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
  | "/log"
  | "/health"
  | "/cryptos"
  | "/decrypt"
  | "/encrypt"
  | "/translate"
  | "/doQueryDB"
  | "/auth/login"
  | "/cryptoPrice"
  | "/addStreamer"
  | "/auth/signup"
  | "/auth/signOut"
  | "/getRandomUUID"
  | "/database/fetch"
  | "/database/update"
  | "/database/insert"
  | "/database/delete"
  | "/getIsLiveStreamer"
  | "/auth/refreshSession";

export type RequestBody = Logs | UserData;

export type PriceBinanceAPI = {
  symbol: string;
  price: number;
}[];

export type ResponseHealth = {
  status: "running";
  timestamp: string;
  uptime: number;
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
  notificationToken?: string;
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
  notificationToken: string;
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
  notificationToken: string;
};

export type ResponseSignOut = {
  success: boolean;
  error?: string;
};

export type RequestDatabaseInsert<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  values: T extends "Users" ? Partial<Tables[T]> : Tables[T] | Tables[T][];
  deviceId: string;
};

export type ResponseDatabaseInsert<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T] | Tables[T][] | null;
  error?: string;
  success: boolean;
};

export type RequestDatabaseFetch<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match: Partial<Tables[T]> | null;
  deviceId: string;
};

export type ResponseDatabaseFetch<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T][] | Tables[T] | Falsy;
  error?: string;
};

export type RequestDatabaseUpdate<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match: Partial<Tables[T]> | null;
  values: Partial<Tables[T]> | Partial<Tables[T]>[];
  deviceId: string;
};

export type ResponseDatabaseUpdate<T extends TablesKeys = TablesKeys> = {
  data?: Tables[T] | Tables[T][] | Falsy;
  error?: string;
  success: boolean;
};

export type RequestDatabaseDelete<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match: Partial<Tables[T]>;
  deviceId: string;
};

export type ResponseDatabaseDelete = {
  success: boolean;
  error?: string;
};

export type ResponseGetRandomUUID = {
  uuid?: string;
  error?: string;
};

export type RequestLogs = {
  log: Logs;
};

export type ResponseLogs = {
  success: boolean;
};
