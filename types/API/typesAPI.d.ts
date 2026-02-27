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
  ResponseGetQRForLogin,
  ResponseGetRandomUUID,
  ResponseDatabaseFetch,
  ResponseDatabaseUpdate,
  ResponseDatabaseInsert,
  ResponseDatabaseDelete,
  ResponseRefreshSession,
  ResponseGetIsLiveStreamer,
  ResponseChangeImageFormat,
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
  RequestGetQRForLogin,
  RequestDatabaseInsert,
  RequestDatabaseUpdate,
  RequestDatabaseDelete,
  RequestRefreshSession,
  RequestGetIsLiveStreamer,
  RequestChangeImageFormat,
} from "./Request";
import type { Handler } from "express";
import { Notifications } from "../typesNotifications";
import type { LanguagesSupported } from "../typesTranslations";
import { AvailableFunctions, SerializableTask } from "../typesTaskRegistry";

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
  body: RequestDecrypt;
  response: ResponseDecrypt;
};
export type EncryptFetch = {
  url: "/encrypt";
  method: MethodsAvailableInAPI["post"];
  body: RequestEncrypt;
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
  response: ResponseAuth<"login">;
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
  response: ResponseAuth<"signup">;
};
export type AuthSignOutFetch = {
  url: "/auth/signOut";
  body: RequestSignOut;
  method: MethodsAvailableInAPI["post"];
  response: ResponseSignOut;
  middlewares: any[];
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
  response: ResponseAuth<"login">;
  middlewares: any[];
};
export type ChangeImageFormat = {
  url: "/images/changeImageFormat";
  body: RequestChangeImageFormat;
  method: MethodsAvailableInAPI["post"];
  response: ResponseChangeImageFormat;
};

export type FetchAPI<T extends TablesKeys = TablesKeys> =
  | LogFetch
  | HealthFetch
  | CryptosFetch
  | DecryptFetch
  | EncryptFetch
  | WebPageFetch
  | DoQueryFetch
  | TranslateFetch
  | AuthLoginFetch
  | AuthSignUpFetch
  | AuthSignOutFetch
  | CryptoPriceFetch
  | AddStreamerFetch
  | ChangeImageFormat
  | UploadUpdateFetch
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
    type: K extends UpdatesRoutes ? "updates" : "api";
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
  T extends keyof MethodsAvailableInAPI | "middleware" | undefined = undefined,
> = T extends "post"
  ? RoutesPostAPI
  : T extends "get"
    ? RoutesGetAPI
    : T extends "put"
      ? RoutesPutAPI
      : T extends "middleware"
        ? Extract<FetchAPI, { middlewares: any[] }>["url"]
        : FetchAPI["url"];
