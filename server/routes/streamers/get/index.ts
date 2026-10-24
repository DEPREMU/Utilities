import {
  handleGetStreamers,
  handleGetStreamerById,
  handleGetStreamersPage,
  handleGetStreamersByUserId,
} from "./handlers";
import { getRouterGet } from "@common";

export const routerStreamersGet = getRouterGet("/streamers", {
  "/": { handler: handleGetStreamers },
  "/page{/:lastId}": { handler: handleGetStreamersPage },
  "/streamer/:streamerId": { handler: handleGetStreamerById },
  "/:userId{/:streamerId}": { handler: handleGetStreamersByUserId },
});
