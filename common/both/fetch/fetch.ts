import type {
  GetParams,
  MethodsAPI,
  FetchToServerPerMethod,
  FetchToServer,
} from "@types";
import axios from "axios";

// const RESPONSE_STATUS: {
//   [method in MethodsAPI]: Record<RoutesAPI[method], number>;
// } = {
//   GET: {},
// };

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

  static getRoute<T extends RoutesAPI[MethodsAPI]>(
    route: T,
    params?: GetParams<T>,
  ): string {
    return (
      ServerFetch.API_URL + ServerFetch.getValidRoute(route as string, params)
    );
  }

  static get: FetchToServerPerMethod["GET"] = async (
    route,
    params,
    ...args
  ) => {
    const token = args[0] as string;

    const response = await axios.get(
      ServerFetch.getRoute(route, params as never),
      {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        validateStatus: () => true,
      },
    );
    return {
      ok: response.status >= 200 && response.status < 400,
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["GET"]>>;
  };

  static post: FetchToServerPerMethod["POST"] = async (
    route,
    body,
    ...args
  ) => {
    const token = args[0] as string;

    const response = await axios.post(
      ServerFetch.getRoute(route, undefined as never),
      body as never,
      {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        validateStatus: () => true,
      },
    );

    return {
      ok: response.status >= 200 && response.status < 400,
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["POST"]>>;
  };

  static delete: FetchToServerPerMethod["DELETE"] = async (
    route,
    body,
    ...args
  ) => {
    const token = args[0] as string;

    const response = await axios.delete(
      ServerFetch.getRoute(route, body as never),
      {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        validateStatus: () => true,
      },
    );

    return {
      ok: response.status >= 200 && response.status < 400,
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["DELETE"]>>;
  };

  static put: FetchToServerPerMethod["PUT"] = async (route, body, ...args) => {
    const token = args[0] as string;

    const response = await axios.put(
      ServerFetch.getRoute(route, undefined as never),
      body as never,
      {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        validateStatus: () => true,
      },
    );

    return {
      ok: response.status >= 200 && response.status < 400,
      data: response.data as never,
      status: response.status,
    } satisfies Awaited<ReturnType<FetchToServerPerMethod["PUT"]>>;
  };

  static server: FetchToServer = async (method, route, body, ...args) => {
    try {
      const res = await ServerFetch[method.toLowerCase() as "get"](
        route as "/info/generate204",
        body,
        ...(args as []),
      );

      return { ...res, data: res.data as never } satisfies Awaited<
        ReturnType<FetchToServer>
      >;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("An unknown error occurred");
    }
  };

  static isServerAlive = async (): Promise<boolean> => {
    try {
      const res = await ServerFetch.get("/info/generate204", undefined);
      return res.status === 204 || res.status === 200;
    } catch {
      return false;
    }
  };
}
