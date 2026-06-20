import {
  handleAppAlive,
  handleGenerate204,
  handleHealthCheck,
} from "./handlers";
import { getRouterGet } from "@/routes/common";

export const routerInfoGet = getRouterGet("/info", {
  "/health": {
    handler: handleHealthCheck,
  },
  "/generate204": {
    handler: handleGenerate204,
  },
  "/appAlive/:deviceId-string/:pushToken-string": {
    handler: handleAppAlive,
  },
});
