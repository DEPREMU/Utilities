import axios from "axios";
import type { FetchToServer, FetchToServerPerMethod } from "@types";

/**
 * Fetch class to handle server requests using axios. It provides methods for GET, POST, DELETE, and PUT requests, ensuring type safety and proper route handling.
 * Before using this class, make sure to set the `API_URL` static property to the base URL of your API.
 */
export class ServerFetch {
  static API_URL = process.env.API_URL || "http://localhost:3000/api";

  static getValidRoute<T extends string>(
    route: T,
    params?: Record<string, unknown>,
  ): string {
    if (route[0] !== "/") {
      route = `/${route}` as T;
    }

    return route
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          const paramName = segment.slice(1).split("-")[0];
          if (params && paramName in params) {
            return encodeURIComponent(params[paramName] as string);
          }
          throw new Error(`Missing parameter: ${paramName}`);
        }
        return segment;
      })
      .join("/");
  }

  static get: FetchToServerPerMethod["GET"] = async (route, params, token) => {
    const validRoute = ServerFetch.getValidRoute(route, params);

    const response = await axios.get(`${ServerFetch.API_URL}${validRoute}`, {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      validateStatus: () => true,
    });
    return {
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["GET"]>>;
  };

  static post: FetchToServerPerMethod["POST"] = async (route, body, token) => {
    const response = await axios.post(
      `${ServerFetch.API_URL}${route}`,
      body as never,
      {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        validateStatus: () => true,
      },
    );
    return {
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["POST"]>>;
  };

  static delete: FetchToServerPerMethod["DELETE"] = async (
    route,
    body,
    token,
  ) => {
    const validRoute = ServerFetch.getValidRoute(route, body);

    const response = await axios.delete(`${ServerFetch.API_URL}${validRoute}`, {
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      validateStatus: () => true,
    });
    return {
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["DELETE"]>>;
  };

  static put: FetchToServerPerMethod["PUT"] = async (route, body, token) => {
    const response = await axios.put(
      `${ServerFetch.API_URL}${route}`,
      body as never,
      {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        validateStatus: () => true,
      },
    );
    return {
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["PUT"]>>;
  };

  static server: FetchToServer = async (method, route, body, token) => {
    try {
      let res = null;
      switch (method) {
        case "GET":
          res = await ServerFetch.get(
            route as RoutesAPI["GET"],
            body,
            token as never,
          );

          break;
        case "POST":
          res = await ServerFetch.post(
            route as RoutesAPI["POST"],
            body,
            token as never,
          );
          break;
        case "DELETE":
          res = await ServerFetch.delete(
            route as RoutesAPI["DELETE"],
            body,
            token as never,
          );
          break;

        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return res as never;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("An unknown error occurred");
    }
  };
}
