import { GetUrlFetch } from "@types";
import { GetRouterObj } from "./Helpers";

export type LogsDelete = GetUrlFetch<"/:logId", null, { auth: true }>;

export type DownDetectorDelete = GetUrlFetch<
  "/:deviceId/:downDetectorId",
  null,
  { auth: true }
>;

export type StreamersDelete = GetUrlFetch<
  "/:deviceId/:streamerId",
  null,
  { auth: true }
>;

export type Delete = {
  "/logs": LogsDelete;
  "/streamers": StreamersDelete;
  "/down-detector": DownDetectorDelete;
};

export type GetRoutesDelete<T extends keyof Delete> = {
  [P in Delete[T]["url"]]: GetRouterObj<Delete[T], P>;
};
