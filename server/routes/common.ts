import chalk from "chalk";
import { Router } from "express";
import { REPLACERS } from "@/config";
import { Helper, Logger, Timers } from "@common";
import {
  Delete,
  Get,
  GetMainRouter,
  GetRoutesDelete,
  GetRoutesGet,
  GetRoutesPost,
  MethodsAPI,
  Post,
} from "@types";
import { GetRouterObj } from "../../types/API/Helpers";

const ROUTES: Record<
  string,
  {
    url: string;
    method: MethodsAPI;
  }[]
> | null = REPLACERS.isDev ? {} : null;

const addRoute = (method: MethodsAPI, key: string, path: string) => {
  if (!REPLACERS.isDev || ROUTES === null) return;

  ROUTES[key] = ROUTES[key] || [];

  if (
    ROUTES[key].some((route) => route.url === path && route.method === method)
  ) {
    throw new Error(
      chalk.red(
        `Duplicate route detected for ${method.toUpperCase()} ${key}${path}. This may lead to unexpected behavior. Please ensure that each route is unique.`,
      ),
    );
  } else {
    ROUTES[key].push({ url: path, method });
  }
};

const getRouter = (
  method: MethodsAPI,
  key: string,
  routes: Record<string, GetRouterObj>,
) => {
  const router = Router();
  Helper.Object.entries(routes).forEach(
    ([path, { handler, middlewares = [] }]) => {
      if (REPLACERS.isDev) addRoute(method, key, path);

      path = path
        .split("/")
        .map((segment) => {
          if (segment[0] !== ":") return segment;
          else {
            const paramName = segment.slice(1).split("-")[0];
            return `:${paramName}`;
          }
        })
        .join("/");

      router[method.toLowerCase() as Lowercase<MethodsAPI>](
        path,
        ...middlewares,
        handler,
      );
    },
  );
  return router;
};

export const getRouterDelete = <T extends keyof Delete>(
  key: T,
  routes: GetRoutesDelete<T>,
): Router => {
  return getRouter("DELETE", key, routes);
};

export const getRouterPost = <T extends keyof Post>(
  key: T,
  routes: GetRoutesPost<T>,
): Router => {
  return getRouter("POST", key, routes);
};

export const getRouterGet = <T extends keyof Get>(
  key: T,
  routes: GetRoutesGet<T>,
): Router => {
  return getRouter("GET", key, routes);
};

export const getMainRouter = (routes: GetMainRouter): Router => {
  const router = Router();
  Helper.Object.entries(routes).forEach(([path, { router: subRouter }]) => {
    try {
      router.use(subRouter);
    } catch (err) {
      throw new Error(
        `Error setting up sub-router for path ${path}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  });

  return router;
};

export const getRouterPerRoute = <T extends keyof Get | keyof Post>(
  route: T,
  routers: Partial<Record<MethodsAPI, Router>>,
  callback?: (router: Router) => unknown,
): Router => {
  const router = Router();
  Object.values(routers).forEach((r) => {
    router.use(route, r);
  });

  if (typeof callback === "function") callback(router);

  return router;
};

if (REPLACERS.isDev)
  Timers.setTimeout(() => {
    const routes = ROUTES || ({} as NonNullable<typeof ROUTES>);

    const allRoutes = Helper.Object.entries(routes).flatMap(
      ([key, routeList]) =>
        routeList.map((route) => ({
          method: route.method,
          path: `api${key}${route.url}`,
        })),
    );

    allRoutes.sort((a, b) => {
      const methodCompare = a.method.localeCompare(b.method);

      if (methodCompare !== 0) {
        return methodCompare;
      }

      return a.path.localeCompare(b.path);
    });

    const string = allRoutes
      .map((route) => `\t- ${route.method.toUpperCase()} ${route.path}`)
      .join("\n");

    Logger.log(
      chalk.blue("Registered API endpoints:\n"),
      chalk.green(string || "\tNo routes registered."),
    );
  }, 2000);
