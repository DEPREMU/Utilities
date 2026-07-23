import { DEFAULT_RESPONSE, GetUrlFetch } from "@types";
import { GetParams, GetRouterObj } from "./Helpers";

export type LogsDelete = GetUrlFetch<
  "/:logId",
  null,
  { auth: true },
  DEFAULT_RESPONSE
>;

export type DownDetectorDelete = GetUrlFetch<
  "/:deviceId/:downDetectorId",
  null,
  { auth: true },
  DEFAULT_RESPONSE
>;

export type StreamersDelete = GetUrlFetch<
  "/:deviceId/:streamerId",
  null,
  { auth: true },
  DEFAULT_RESPONSE
>;

export type Delete = {
  "/logs": LogsDelete;
  "/streamers": StreamersDelete;
  "/down-detector": DownDetectorDelete;
};

export type GetRoutesDelete<T extends keyof Delete> = {
  [P in Delete[T]["url"]]: GetRouterObj<Delete[T], P>;
};
