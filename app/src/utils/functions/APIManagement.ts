import {
  RoutesAPI,
  TablesKeys,
  RequestBody,
  ResponseFetch,
  UpdatesRoutes,
  ResponseHealth,
  RoutesAPIWithItsMethod,
} from "@types";
import { logger } from "./debug";
import axios, { AxiosRequestConfig } from "axios";
import { PRODUCTION_URLS, REPLACERS, URLS } from "../TOP_LEVEL";
import { stringifyData, storageManagement } from "../services/storage";

const TAG = "APIManagement";

const POST_API = {
  type: "api",
  method: "post",
} as const;

const GET_API = {
  type: "api",
  method: "get",
} as const;

const POST_UPDATES = {
  type: "updates",
  method: "post",
} as const;

const GET_UPDATES = {
  type: "updates",
  method: "get",
} as const;

const ROUTES: RoutesAPIWithItsMethod = {
  "/log": POST_API,
  "/health": GET_API,
  "/generate204": GET_API,
  "/cryptos": POST_API,
  "/cryptoPrice": POST_API,
  "/translate": POST_API,
  "/addStreamer": POST_API,
  "/getIsLiveStreamer": POST_API,
  "/auth/login": POST_API,
  "/auth/refreshSession": POST_API,
  "/auth/signOut": POST_API,
  "/auth/signup": POST_API,
  "/database/fetch": POST_API,
  "/debug/appAlive": POST_API,
  "/database/insert": POST_API,
  "/database/update": { method: "put", type: "api" },
  "/database/delete": POST_API,
  "/doQueryDB": POST_API,
  "/encrypt": POST_API,
  "/decrypt": POST_API,
  "/images/changeImageFormat": POST_API,
  "/upload-update": POST_UPDATES,
  "/is-update-available": POST_UPDATES,
  "/web-page": GET_UPDATES,
  "/download/:buildType/:version/:platformOS/:id": GET_UPDATES,
} as const;

/**
 * Constructs a full API route URL by appending the given route to the base API URL.
 *
 * @param route - The specific route to append to the base API URL.
 * @returns The full API route URL as a string.
 *
 * @remarks
 * This function is useful for constructing API endpoints dynamically.
 * For example, if the base API URL is "https://example.com/api/v1"
 * and the route is "users", the resulting URL will be:
 * "https://example.com/api/v1/users".
 */
export const getRouteAPI = async (route: RoutesAPI | UpdatesRoutes) => {
  let isOk: boolean = false;
  await storageManagement.waitUntilInitialized();
  let apiUrl = storageManagement.get("API_URL");

  if (!apiUrl) {
    apiUrl = URLS.api;
    try {
      const res = await axios.get<ResponseHealth>(apiUrl + "/health", {
        timeout: 2000,
      });
      isOk = res.data.status === "running";
    } catch {
      // Ignore
    }

    if (isOk) {
      storageManagement.save("API_URL", URLS.api);
      storageManagement.save("WEBSOCKET_URL", URLS.ws);
      storageManagement.save("CLIPBOARD_WEBSOCKET_URL", URLS.clipboard);
    } else {
      logger.warn(TAG, "Falling back to server API URL and WebSocket URL");
      apiUrl = PRODUCTION_URLS?.api || URLS.api;
      storageManagement.save("API_URL", apiUrl);
      storageManagement.save("WEBSOCKET_URL", PRODUCTION_URLS?.ws || URLS.ws);
      storageManagement.save(
        "CLIPBOARD_WEBSOCKET_URL",
        PRODUCTION_URLS?.clipboard || URLS.clipboard,
      );
    }
  }
  if (ROUTES[route].type === "updates")
    apiUrl = apiUrl.replace("api", "updates");

  return `${apiUrl}${route}`;
};

/**
 * Constructs a full image route URL by appending the given filename to the base API URL.
 *
 * @param filename - The name of the image file to append to the base API URL.
 * @returns The full image route URL as a string.
 *
 * @remarks
 * This function is useful for constructing image URLs dynamically.
 * For example, if the base API URL is "https://example.com/api"
 * and the filename is "/images/photo.jpg", the resulting URL will be:
 * "https://example.com/images/photo.jpg".
 */
export const getRouteImage = (filename: string): string => {
  const apiUrl = storageManagement.get("API_URL", URLS.api);
  return `${apiUrl.replace("/api", "")}${filename}`;
};

export enum APIErrorWhy {
  ServerError = "ServerError",
  NetworkError = "NetworkError",
  UnknownError = "UnknownError",
  FetchWithCellularDataOff = "CellularDataOff",
}

type FetchToServer = <
  R extends RoutesAPI | UpdatesRoutes,
  B extends RequestBody<R> extends { table: infer T }
    ? T extends TablesKeys
      ? RequestBody<R, T>
      : never
    : RequestBody<R>,
>(
  route: R,
  ...bodyAndToken: R extends RoutesAPI<"get">
    ? []
    : R extends RoutesAPI<"middleware">
      ? [body: B, token: string]
      : [body: B]
) => Promise<
  | ResponseFetch<R, B>
  | {
      ok: false;
      why: APIErrorWhy;
      data: null;
      errorText: string;
    }
>;

export const fetchToServer: FetchToServer = async (route, ...bodyAndToken) => {
  const { deviceInfo } = await import("@utils");
  await deviceInfo?.waitUntilInitialized();

  const apiRoute = await getRouteAPI(route);

  try {
    const info = deviceInfo.fetchNetworkInfo;

    if (
      info.isCellular &&
      !info.fetchWithCellularData &&
      (REPLACERS.isProduction || route !== "/debug/appAlive")
    )
      return {
        ok: false,
        why: APIErrorWhy.FetchWithCellularDataOff,
        data: null,
        errorText: "Fetching with cellular data is turned off in settings.",
      };
    if (!deviceInfo.hasInternet)
      return {
        ok: false,
        why: APIErrorWhy.NetworkError,
        data: null,
        errorText: "No internet connection available.",
      };

    const method = ROUTES[route].method;

    const body = bodyAndToken?.[0];
    const token = bodyAndToken?.[1];

    const isBodyMethod = method === "post" || method === "put";

    const data = isBodyMethod && body ? stringifyData(body) : undefined;

    const config: AxiosRequestConfig = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const res = await axios[method](
      apiRoute,
      ...(isBodyMethod ? [data, config] : [config]),
    );

    const ok = res.status >= 200 && res.status < 300;

    return {
      ok,
      data: res.data || null,
      errorText: ok ? undefined : res.data?.error || res.statusText,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      "FETCH_TO_SERVER",
      `Error fetching to server at route ${apiRoute}:`,
      errorMessage,
    );
    return {
      ok: false,
      data: null,
      errorText: errorMessage,
    };
  }
};

/**
 * Checks whether the server is reachable and responding successfully.
 *
 * This function resolves the API route for `"/generate204"` and performs
 * a `GET` request with a 2-second timeout. It returns `true` when the
 * response status is in the 2xx range, and `false` if the request fails,
 * times out, or returns a non-success status.
 *
 * @returns A promise that resolves to `true` if the server is alive; otherwise `false`.
 */
export const checkServerAlive = async (): Promise<boolean> => {
  try {
    const route = await getRouteAPI("/generate204");
    const res = await axios.get(route, { timeout: 2000 });
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
};
