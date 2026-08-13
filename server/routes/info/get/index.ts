import {
  handleAppAlive,
  handleGenerate204,
  handleHealthCheck,
} from "./handlers";
import { getRouterGet } from "@common";

export const routerInfoGet = getRouterGet("/info", {
  "/health": { handler: handleHealthCheck },
  "/generate204": { handler: handleGenerate204 },
  "/appAlive/:deviceId/:pushToken": { handler: handleAppAlive },
});
