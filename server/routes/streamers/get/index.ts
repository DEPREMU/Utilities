import {
  handleGetStreamers,
  handleGetStreamerById,
  handleGetStreamersPage,
  handleAddStreamerByUserId,
  handleGetStreamersByUserId,
} from "./handlers";
import { getRouterGet } from "@/routes/common";

export const routerStreamersGet = getRouterGet("/streamers", {
  "/": { handler: handleGetStreamers },
  "/:streamerId": { handler: handleGetStreamerById },
  "/page": { handler: handleGetStreamersPage },
  "/:userId": { handler: handleGetStreamersByUserId },
  "/add/:userId/:streamerName": { handler: handleAddStreamerByUserId },
  "/page/:page-number-optional": { handler: handleGetStreamersPage },
  "/:userId/:streamerId-optional": { handler: handleGetStreamersByUserId },
});
