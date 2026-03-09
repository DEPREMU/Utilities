import {
  API_URL,
  URL_WEB_SOCKET,
  fallbackAPI_URL,
  CLIPBOARD_WS_URL,
  fallbackURL_WEB_SOCKET,
  fallbackCLIPBOARD_WS_URL,
} from "../constants/server";
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
import { stringifyData, storageManagement } from "../services/storage";

const TAG = "APIManagement";

const POST_API = {
  type: "api",
  method: "post",
} as const;

const ROUTES: RoutesAPIWithItsMethod = {
  "/log": POST_API,
  "/health": { method: "get", type: "api" },
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
  "/upload-update": { method: "post", type: "updates" },
  "/is-update-available": { method: "post", type: "updates" },
  "/web-page": { method: "get", type: "updates" },
  "/download/:buildType/:version/:platformOS/:id": {
    method: "get",
    type: "updates",
  },
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
  await storageManagement.waitUntilLoaded();
  let apiUrl = storageManagement.get("API_URL");

  if (!apiUrl) {
    apiUrl = API_URL;
    try {
      const res = await axios.get<ResponseHealth>(apiUrl + "/health", {
        timeout: 2000,
      });
      isOk = res.data.status === "running";
    } catch {
      // Ignore
    }

    if (isOk) {
      storageManagement.save("API_URL", API_URL);
      storageManagement.save("WEBSOCKET_URL", URL_WEB_SOCKET);
      storageManagement.save("CLIPBOARD_WEBSOCKET_URL", CLIPBOARD_WS_URL);
    } else {
      logger.warn(TAG, "Falling back to server API URL and WebSocket URL");
      apiUrl = fallbackAPI_URL;
      storageManagement.save("API_URL", fallbackAPI_URL);
      storageManagement.save("WEBSOCKET_URL", fallbackURL_WEB_SOCKET);
      storageManagement.save(
        "CLIPBOARD_WEBSOCKET_URL",
        fallbackCLIPBOARD_WS_URL,
      );
    }
  }
  if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);
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
  const apiUrl = storageManagement.get("API_URL", API_URL);
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
  try {
    const { deviceInfo } = await import("@utils");
    await deviceInfo?.waitUntilLoaded();

    const info = deviceInfo.fetchNetworkInfo;

    if (info.isCellular && !info.fetchWithCellularData)
      return {
        ok: false,
        why: APIErrorWhy.FetchWithCellularDataOff,
        data: null,
        errorText: "Fetching with cellular data is turned off in settings.",
      };

    const apiRoute = await getRouteAPI(route);

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
      `Error fetching to server at route ${route}:`,
      errorMessage,
    );
    return {
      ok: false,
      data: null,
      errorText: errorMessage,
    };
  }
};
