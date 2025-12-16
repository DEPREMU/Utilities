import env from "../env.ts";
import { RoutesAPI, MethodsAvailableInAPI, UpdatesRoutes } from "@types";

/**
 * Gets the base API URL from environment variables
 * @returns The complete API URL (e.g., http://localhost:3000/api)
 */
export const getApiUrl = (isUpdatesRoute: boolean): string => {
  const protocol = env.USE_HTTPS === "true" ? "https" : "http";
  const host = env.HOST;
  const port = env.PORT;

  return `${protocol}://${host}:${port}/${isUpdatesRoute ? "updates" : "api"}`;
};

/**
 * Gets the WebSocket URL from environment variables
 * @returns The complete WebSocket URL
 */
export const getWsUrl = (): string => {
  return env.WS_URL;
};

const routesUpdates: Record<UpdatesRoutes, null> = {
  "/web-page": null,
  "/upload-update": null,
  "/is-update-available": null,
  "/download/:buildType/:version/:platformOS/:id": null,
};
/**
 * Builds a complete URL for a given route
 * @param route - The API route path
 * @returns The complete URL including protocol, host, port, and route
 */
export const buildUrl = (route: RoutesAPI): string => {
  const isUpdatesRoute = Object.keys(routesUpdates).includes(
    route as UpdatesRoutes,
  );

  const baseUrl = getApiUrl(isUpdatesRoute);
  return `${baseUrl}${route}`;
};

/**
 * Makes an HTTP request to the API
 * @param route - The API route to call
 * @param method - HTTP method (GET, POST, PUT)
 * @param body - Request body (for POST/PUT)
 * @param headers - Additional headers
 * @returns Response data
 */
export const makeRequest = async <T>(
  route: RoutesAPI,
  method: MethodsAvailableInAPI[keyof MethodsAvailableInAPI],
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> => {
  const url = buildUrl(route);
  const options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    Authorization?: string;
  } = {
    method: method.toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && (method === "post" || method === "put")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  let data: string = "";

  data = await response.text();

  try {
    data = JSON.parse(data);
  } catch {
    return data as T;
  }

  return data as T;
};
