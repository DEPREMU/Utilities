import { getRouterGet } from "@common";
import { authMiddleware } from "../middlewares/auth";
import { handleGetLogs, handleGetLogsPage } from "./handlers";

export const routerLogsGet = getRouterGet("/logs", {
  "/": { handler: handleGetLogs, middlewares: [authMiddleware] },
  "/page{/:lastId}": {
    handler: handleGetLogsPage,
    middlewares: [authMiddleware],
  },
});
