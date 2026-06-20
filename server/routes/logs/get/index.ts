import { getRouterGet } from "@/routes/common";
import { handleGetLogs, handleGetLogsPage } from "./handlers";

export const routerLogsGet = getRouterGet("/logs", {
  "/": { handler: handleGetLogs },
  "/page": { handler: handleGetLogsPage },
  "/page/:page-number-optional": { handler: handleGetLogsPage },
});
