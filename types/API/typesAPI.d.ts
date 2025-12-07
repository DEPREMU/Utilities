import type {
  Logs,
  Cryptos,
  Streamer,
  UserData,
  TablesKeys,
  DownDetector,
} from "../database";
import {
  WebPageFetch,
  UpdatesRoutes,
  UploadUpdateFetch,
  DownloadUploadFetch,
  IsUpdateAvailableFetch,
  DownloadViaTempUrlFetch,
} from "./typesUpdates";
import type {
  ResponseAuth,
  ResponseLogs,
  ResponseHealth,
  ResponseCryptos,
  ResponseDecrypt,
  ResponseSignOut,
  ResponseDoQuery,
  ResponseEncrypt,
  ResponseTranslate,
  ResponseCryptoPrice,
  ResponseAddStreamer,
  ResponseGetRandomUUID,
  ResponseDatabaseFetch,
  ResponseDatabaseUpdate,
  ResponseDatabaseInsert,
  ResponseDatabaseDelete,
  ResponseRefreshSession,
  ResponseGetIsLiveStreamer,
} from "./Response";

import {
  RequestAuth,
  RequestCryptos,
  RequestDecrypt,
  RequestDoQuery,
  RequestEncrypt,
  RequestSignOut,
  RequestTranslate,
  RequestCryptoPrice,
  RequestAddStreamer,
  RequestDatabaseFetch,
  RequestDatabaseInsert,
  RequestDatabaseUpdate,
  RequestDatabaseDelete,
  RequestRefreshSession,
  RequestGetIsLiveStreamer,
} from "./Request";
import type { Handler } from "express";
import { Notifications } from "../typesNotifications";
import type { LanguagesSupported } from "../typesTranslations";
import { AvailableFunctions, SerializableTask } from "../typesTaskRegistry";

export type Command = {
  when: "Start-up" | "Shut-down";
  command: string;
};

export type PriceBinanceAPI = {
  symbol: string;
  price: number;
}[];

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
  "@pendingTasks": SerializableTask<AvailableFunctions>[] | null;
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

export type MethodsAvailableInAPI = {
  get: "get";
  put: "put";
  post: "post";
};

export type Route<T extends RoutesAPI | UpdatesRoutes> = {
  method: Extract<FetchAPI, { url: T }>["method"];
  handler: Handler;
  middlewares?: Extract<FetchAPI, { url: T }> extends { middlewares: infer M }
    ? M
    : undefined;
};

export type Coin = {
  id: string;
  name: string;
  symbol: string;
};

export type LogFetch = {
  url: "/log";
  method: MethodsAvailableInAPI["post"];
  body: Logs;
  response: ResponseLogs;
};
export type HealthFetch = {
  url: "/health";
  method: MethodsAvailableInAPI["get"];
  response: ResponseHealth;
};
export type CryptosFetch = {
  url: "/cryptos";
  method: MethodsAvailableInAPI["post"];
  body: RequestCryptos;
  response: ResponseCryptos;
};
export type DecryptFetch = {
  url: "/decrypt";
  method: MethodsAvailableInAPI["post"];
  body: RequestEncrypt;
  response: ResponseDecrypt;
};
export type EncryptFetch = {
  url: "/encrypt";
  method: MethodsAvailableInAPI["post"];
  body: RequestDecrypt;
  response: ResponseEncrypt;
};
export type TranslateFetch = {
  url: "/translate";
  body: RequestTranslate;
  method: MethodsAvailableInAPI["post"];
  response: ResponseTranslate;
};
export type DoQueryFetch = {
  url: "/doQueryDB";
  body: RequestDoQuery;
  method: MethodsAvailableInAPI["post"];
  response: ResponseDoQuery;
};
export type AuthLoginFetch = {
  url: "/auth/login";
  body: RequestAuth<"login">;
  method: MethodsAvailableInAPI["post"];
  response: ResponseAuth;
};
export type CryptoPriceFetch = {
  url: "/cryptoPrice";
  body: RequestCryptoPrice;
  method: MethodsAvailableInAPI["post"];
  response: ResponseCryptoPrice;
};
export type AddStreamerFetch = {
  url: "/addStreamer";
  body: RequestAddStreamer;
  method: MethodsAvailableInAPI["post"];
  response: ResponseAddStreamer;
};
export type AuthSignUpFetch = {
  url: "/auth/signup";
  body: RequestAuth<"signup">;
  method: MethodsAvailableInAPI["post"];
  response: ResponseAuth;
};
export type AuthSignOutFetch = {
  url: "/auth/signOut";
  body: RequestSignOut;
  method: MethodsAvailableInAPI["post"];
  response: ResponseSignOut;
  middlewares: any[];
};
export type GetRandomUUIDFetch = {
  url: "/getRandomUUID";
  method: MethodsAvailableInAPI["get"];
  response: ResponseGetRandomUUID;
};
export type DatabaseFetchFetch<T extends TablesKeys = TablesKeys> = {
  url: "/database/fetch";
  body: RequestDatabaseFetch<T>;
  method: MethodsAvailableInAPI["post"];
  response: ResponseDatabaseFetch<T>;
  middlewares: any[];
};
export type DatabaseUpdateFetch<T extends TablesKeys = TablesKeys> = {
  url: "/database/update";
  body: RequestDatabaseUpdate<T>;
  method: MethodsAvailableInAPI["put"];
  response: ResponseDatabaseUpdate<T>;
  middlewares: any[];
};
export type DatabaseInsertFetch<T extends TablesKeys = TablesKeys> = {
  url: "/database/insert";
  body: RequestDatabaseInsert<T>;
  method: MethodsAvailableInAPI["post"];
  response: ResponseDatabaseInsert<T>;
  middlewares: any[];
};
export type DatabaseDeleteFetch<T extends TablesKeys = TablesKeys> = {
  url: "/database/delete";
  body: RequestDatabaseDelete<T>;
  method: MethodsAvailableInAPI["post"];
  response: ResponseDatabaseDelete;
  middlewares: any[];
};
export type GetIsLiveStreamerFetch = {
  url: "/getIsLiveStreamer";
  body: RequestGetIsLiveStreamer;
  method: MethodsAvailableInAPI["post"];
  response: ResponseGetIsLiveStreamer;
};
export type AuthRefreshSessionFetch = {
  url: "/auth/refreshSession";
  body: RequestRefreshSession;
  method: MethodsAvailableInAPI["post"];
  response: ResponseRefreshSession;
  middlewares: any[];
};

export type FetchAPI<T extends TablesKeys = TablesKeys> =
  | LogFetch
  | HealthFetch
  | CryptosFetch
  | DecryptFetch
  | EncryptFetch
  | WebPageFetch
  | TranslateFetch
  | DoQueryFetch
  | AuthLoginFetch
  | AuthSignUpFetch
  | AuthSignOutFetch
  | CryptoPriceFetch
  | AddStreamerFetch
  | UploadUpdateFetch
  | GetRandomUUIDFetch
  | DownloadUploadFetch
  | DatabaseFetchFetch<T>
  | DatabaseUpdateFetch<T>
  | DatabaseInsertFetch<T>
  | DatabaseDeleteFetch<T>
  | IsUpdateAvailableFetch
  | GetIsLiveStreamerFetch
  | DownloadViaTempUrlFetch
  | AuthRefreshSessionFetch;

export type RoutesAPIWithItsMethod = {
  [K in RoutesAPI | UpdatesRoutes]: {
    method: Extract<FetchAPI, { url: K }>["method"];
    type: "updates" | "api";
  };
};

type RoutesPostAPI = Extract<
  FetchAPI,
  { method: MethodsAvailableInAPI["post"] }
>["url"];

type RoutesPutAPI = Extract<
  FetchAPI,
  { method: MethodsAvailableInAPI["put"] }
>["url"];

type RoutesGetAPI = Extract<
  FetchAPI,
  { method: MethodsAvailableInAPI["get"] }
>["url"];

export type RoutesAPI<
  T extends keyof MethodsAvailableInAPI | "middleware" | undefined = undefined
> = T extends "post"
  ? RoutesPostAPI
  : T extends "get"
  ? RoutesGetAPI
  : T extends "put"
  ? RoutesPutAPI
  : T extends "middleware"
  ? Extract<FetchAPI, { middlewares: any[] }>["url"]
  : FetchAPI["url"];
