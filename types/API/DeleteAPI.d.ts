import { DEFAULT_RESPONSE, GetUrlFetch } from "@types";
import { GetParams, GetRouterObj } from "./Helpers";

export type LogsDelete = GetUrlFetch<
  "/:logId",
  null,
  { auth: true },
  DEFAULT_RESPONSE
>;

export type Delete = {
  "/logs": LogsDelete;
};

export type GetRoutesDelete<T extends keyof Delete> = {
  [P in Delete[T]["url"]]: GetRouterObj<Delete[T], P>;
};
