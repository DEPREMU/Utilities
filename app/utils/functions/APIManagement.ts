import {
  API_URL,
  URL_WEB_SOCKET,
  fallbackAPI_URL,
  CLIPBOARD_WS_URL,
  fallbackURL_WEB_SOCKET,
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
import { isFalsy } from "@utils";
import { stringifyData } from "./appManagement";
import axios, { AxiosRequestConfig } from "axios";
import { loadDataStorage, saveDataStorage } from "./storageManagement";

/**
 * Generates an options object for a fetch request.
 *
 * @param method - The HTTP method to use for the request. Can be either "POST" or "GET".
 * @param body - An optional request body, which can be of type `RequestEncrypt` or `RequestDecrypt`.
 *               If provided, it will be stringified and included in the request.
 * @returns An object containing the HTTP method, headers, and optionally the stringified body.
 */
export const fetchOptions = <T = RequestBody>(body?: T, token?: string) => {
  try {
    if (body) body = stringifyData(body) as T;
  } catch (error) {
    logger.error("Error stringifying request body:", error);
    body = undefined;
  }
  return {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: body as string | undefined,
  };
};

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
export const getRouteAPI = async (
  route: RoutesAPI | UpdatesRoutes,
): Promise<string> => {
  let isOk: boolean = false;
  let apiUrl = await loadDataStorage("API_URL");

  if (isFalsy(apiUrl)) {
    apiUrl = API_URL;
    try {
      const res = await axios.get<ResponseHealth>(apiUrl + "/health", {
        timeout: 5000,
      });
      isOk = res.data.status === "running";
    } catch {
      logger.warn("Error fetching API URL health");
    }

    if (isOk)
      await Promise.all([
        saveDataStorage("API_URL", API_URL),
        saveDataStorage("WEBSOCKET_URL", URL_WEB_SOCKET),
        saveDataStorage("CLIPBOARD_WEBSOCKET_URL", CLIPBOARD_WS_URL),
      ]);
    else {
      logger.warn("Falling back to server API URL and WebSocket URL");
      apiUrl = fallbackAPI_URL;
      await Promise.all([
        saveDataStorage("API_URL", fallbackAPI_URL),
        saveDataStorage("WEBSOCKET_URL", fallbackURL_WEB_SOCKET),
      ]);
    }
  }
  if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);
  if (routes[route].type === "updates")
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
export const getRouteImage = async (filename: string): Promise<string> => {
  const apiUrl = await loadDataStorage("API_URL", API_URL);
  return `${apiUrl.replace("/api", "")}${filename}`;
};

const routes: RoutesAPIWithItsMethod = {
  "/log": { method: "post", type: "api" },
  "/health": { method: "get", type: "api" },
  "/cryptos": { method: "post", type: "api" },
  "/cryptoPrice": { method: "post", type: "api" },
  "/translate": { method: "post", type: "api" },
  "/addStreamer": { method: "post", type: "api" },
  "/getIsLiveStreamer": { method: "post", type: "api" },
  "/auth/login": { method: "post", type: "api" },
  "/auth/refreshSession": { method: "post", type: "api" },
  "/auth/signOut": { method: "post", type: "api" },
  "/auth/signup": { method: "post", type: "api" },
  "/database/fetch": { method: "post", type: "api" },
  "/database/insert": { method: "post", type: "api" },
  "/database/update": { method: "put", type: "api" },
  "/database/delete": { method: "post", type: "api" },
  "/doQueryDB": { method: "post", type: "api" },
  "/encrypt": { method: "post", type: "api" },
  "/decrypt": { method: "post", type: "api" },
  "/getRandomUUID": { method: "get", type: "api" },
  "/images/changeImageFormat": { method: "post", type: "api" },
  "/upload-update": { method: "post", type: "updates" },
  "/is-update-available": { method: "post", type: "updates" },
  "/web-page": { method: "get", type: "updates" },
  "/download/:buildType/:version/:platformOS/:id": {
    method: "get",
    type: "updates",
  },
};

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
) => Promise<ResponseFetch<R, B>>;

export const fetchToServer: FetchToServer = async (route, ...bodyAndToken) => {
  try {
    const apiRoute = await getRouteAPI(route);

    const method = routes[route].method;

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

    return {
      ok: res.status >= 200 && res.status < 300,
      data: res.data || null,
      errorText: res.data?.error || res.statusText || undefined,
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
