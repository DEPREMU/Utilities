import {
  FetchAPI,
  RoutesAPI,
  RoutesPutAPI,
  RoutesPostAPI,
  MethodsAvailableInAPI,
} from "./typesAPI";
import { LanguagesSupported } from "../typesTranslations";
import { Logs, Streamer, Tables, TablesKeys } from "../database";
import { BuildTypeUpdates, PlatformsOS, UpdatesRoutes } from "./typesUpdates";

export type RequestBody<
  T extends RoutesAPI | UpdatesRoutes = RoutesAPI | UpdatesRoutes,
  U extends TablesKeys = TablesKeys,
> = T extends RoutesPostAPI | RoutesPutAPI
  ? Extract<
      FetchAPI<U>,
      {
        url: T;
        method: MethodsAvailableInAPI["put"] | MethodsAvailableInAPI["post"];
      }
    >["body"]
  : undefined;

export type ResponseFetch<
  T extends RoutesAPI | UpdatesRoutes,
  B = RequestBody<T>,
> = {
  ok: boolean;
  data:
    | (B extends { table: infer Table }
        ? Table extends TablesKeys
          ? Extract<FetchAPI<Table>, { url: T }>["response"]
          : never
        : Extract<FetchAPI, { url: T }>["response"])
    | null;
  errorText?: string;
};

export type RequestCryptoPrice = {
  cryptoId: string;
  currency: string;
};

export type RequestCryptos = {
  currency?: string;
};

export type RequestTranslate = {
  text: string;
  targetLang: string;
};

export type RequestAddStreamer = {
  name: string;
  userId: string;
};

export type RequestGetIsLiveStreamer = {
  streamer: Streamer;
};

export type RequestAuth<T extends "login" | "signup"> = {
  lang: LanguagesSupported;
  email: string;
  password: string;
} & (T extends "login"
  ? {
      deviceId: string;
      rememberMe: boolean;
      notificationToken: string;
    }
  : {});

export type RequestRefreshSession = {
  lang: LanguagesSupported;
  deviceId: string;
};

export type RequestSignOut = {
  lang: LanguagesSupported;
  deviceId: string;
};

export type RequestDatabaseInsert<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  values: T extends "Users" ? Partial<Tables[T]> : Tables[T] | Tables[T][];
  deviceId: string;
};

export type RequestDatabaseFetchWithoutPagination<
  T extends TablesKeys = TablesKeys,
> = {
  lang: LanguagesSupported;
  table: T;
  match?: Partial<Tables[T]>;
  deviceId: string;
  pagination?: false;
};

export type RequestDatabaseFetchWithPagination<
  T extends TablesKeys = TablesKeys,
  U extends Tables[T] = Tables[T],
> = {
  lang: LanguagesSupported;
  table: T;
  match?: Partial<U>;
  deviceId: string;
  pagination: true;
  limit?: number;
  offset?: number;
  orderBy: keyof U;
  orderDirection: "ASC" | "DESC";
};

export type RequestDatabaseFetchWithoutSearch = {
  search?: undefined;
};

export type RequestDatabaseFetchSearch<
  T extends TablesKeys = TablesKeys,
  K extends keyof Tables[T] = keyof Tables[T],
> = {
  search: string;
  columnsToSearch: K[] | K;
};

export type RequestDatabaseFetch<T extends TablesKeys = TablesKeys> = (
  | RequestDatabaseFetchWithPagination<T>
  | RequestDatabaseFetchWithoutPagination<T>
) &
  (RequestDatabaseFetchSearch<T> | RequestDatabaseFetchWithoutSearch);

export type RequestDatabaseUpdate<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match?: Partial<Tables[T]>;
  values: Partial<Tables[T]> | Partial<Tables[T]>[];
  deviceId: string;
};

export type RequestDatabaseDelete<T extends TablesKeys = TablesKeys> = {
  lang: LanguagesSupported;
  table: T;
  match?: Partial<Tables[T]>;
  deviceId: string;
};

export type RequestLogs = Logs;

export type RequestDoQuery = {
  query: string;
  showFields?: boolean;
};

export type RequestEncrypt = {
  dataToEncrypt: string;
};

export type RequestDecrypt = {
  dataToDecrypt: string;
};

export type RequestIsUpdateAvailable<
  T extends BuildTypeUpdates = BuildTypeUpdates,
> = {
  buildType: T;
  currentVersion: string;
  platformOS: T extends "android" ? undefined : PlatformsOS;
};

export type RequestUploadUpdate =
  | {
      version: string;
      timestamp: number;
      buildType: Exclude<BuildTypeUpdates, "android">;
      platformOS: PlatformsOS;
    }
  | {
      version: string;
      timestamp: number;
      buildType: "android";
      platformOS: undefined;
    };

export type RequestDownloadViaTempUrl = {
  buildType: BuildTypeUpdates;
  platformOS: PlatformsOS;
  version: string;
  id: string;
};

export type RequestChangeImageFormat = {
  lang: LanguagesSupported;
  format: "jpeg" | "png" | "webp" | "avif" | "gif";
  imageBufferInString: string;
};

export type RequestDebugAppAlive = {
  deviceId: string;
  pushToken: string;
};
