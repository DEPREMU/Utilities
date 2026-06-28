import {
  handleGetStreamers,
  handleGetStreamerById,
  handleGetStreamersPage,
  handleAddStreamerByUserId,
  handleGetStreamersByUserId,
} from "./handlers";
import { getRouterGet } from "@common";

export const routerStreamersGet = getRouterGet("/streamers", {
  "/": { handler: handleGetStreamers },
  "/page": { handler: handleGetStreamersPage },
  "/:userId": { handler: handleGetStreamersByUserId },
  "/streamer/:streamerId": { handler: handleGetStreamerById },
  "/add/:userId/:streamerName": { handler: handleAddStreamerByUserId },
  "/page/:page-number-optional": { handler: handleGetStreamersPage },
  "/:userId/:streamerId-optional": { handler: handleGetStreamersByUserId },
});
