import type {
  MethodsAPI,
  ResolveRoute,
  FetchToServer,
  FetchToServerPerMethod,
} from "@types";
import axios from "axios";

/**
 * Fetch class to handle server requests using axios. It provides methods for GET, POST, DELETE, and PUT requests, ensuring type safety and proper route handling.
 * Before using this class, make sure to set the `API_URL` static property to the base URL of your API.
 */
export class ServerFetch {
  static API_URL = process.env.API_URL || "http://localhost:3000/api";

  static getValidRoute<T extends string>(
    route: T,
    options: Partial<Record<"params" | "query", Record<string, unknown>>> = {},
  ): string {
    const { params = {}, query = {} } = options;
    if (!route.startsWith("/")) {
      route = `/${route}` as T;
    }
    const replaceParams = (value: string, optional = false): string | null => {
      let missing = false;
      const result = value.replace(
        /:([a-zA-Z0-9_]+)/g,
        (_, paramName: string) => {
          if (!(paramName in params)) {
            missing = true;
            return "";
          }
          return encodeURIComponent(String(params[paramName]));
        },
      );
      if (optional && missing) {
        return null;
      }
      if (missing) {
        throw new Error(`Missing parameter: ${value}`);
      }
      return result;
    };
    const resolveOptionals = (value: string): string => {
      let result = "";
      let i = 0;
      while (i < value.length) {
        if (value[i] !== "{") {
          result += value[i];
          i++;
          continue;
        }
        let depth = 1;
        let j = i + 1;
        while (j < value.length && depth > 0) {
          if (value[j] === "{") {
            depth++;
          } else if (value[j] === "}") {
            depth--;
          }
          j++;
        }
        if (depth !== 0) {
          throw new Error(
            `Invalid route: unclosed optional group in "${route}"`,
          );
        }
        const content = value.slice(i + 1, j - 1);
        const resolved = resolveOptionals(content);
        const replaced = replaceParams(resolved, true);
        if (replaced !== null) {
          result += replaced;
        }
        i = j;
      }
      return result;
    };
    const resolvedRoute = replaceParams(resolveOptionals(route)) ?? "";
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => {
          searchParams.append(key, String(item));
        });
      } else {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `${resolvedRoute}?${queryString}` : resolvedRoute;
  }

  static getRoute<M extends MethodsAPI, R extends RoutesAPI[MethodsAPI]>(
    _method: M,
    route: R,
    params?: ResolveRoute<FetchAPI<M>, R>["requestInput"],
  ): string {
    return ServerFetch.API_URL + ServerFetch.getValidRoute(route, params);
  }

  static get: FetchToServerPerMethod["GET"] = async (route, ...args) => {
    const params = args[0];
    const token = args[1] as string;

    const response = await axios.get(
      ServerFetch.getRoute("GET", route, params as never),
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

  static post: FetchToServerPerMethod["POST"] = async (route, ...args) => {
    const body = args[0];
    const token = args[1] as string;

    const response = await axios.post(
      ServerFetch.getRoute("POST", route),
      body?.body ?? body,
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

  static delete: FetchToServerPerMethod["DELETE"] = async (route, ...args) => {
    const body = args[0];
    const token = args[1] as string;

    const response = await axios.delete(
      ServerFetch.getRoute("DELETE", route, body as never),
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

  static put: FetchToServerPerMethod["PUT"] = async (route, ...args) => {
    const body = args[0];
    const token = args[1] as string;

    const response = await axios.put(
      ServerFetch.getRoute("PUT", route, undefined as never),
      (body?.body ?? body) as never,
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

  static server: FetchToServer = async (method, route, ...args) => {
    try {
      const res = await ServerFetch[method.toLowerCase() as "get"](
        route as "/info/generate204",
        ...(args as unknown as []),
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

  static async isServerAlive(): Promise<boolean> {
    try {
      const res = await ServerFetch.get("/info/generate204");
      return res.status === 204 || res.status === 200;
    } catch {
      return false;
    }
  }
}
