import { DEFAULT_RESPONSE, GetRouterObj, GetUrlFetch } from "@types";

type LogsFetch = GetUrlFetch<"/", {}, {}, DEFAULT_RESPONSE>;

export type Put = {
  "/logs": LogsFetch;
};

export type RequestBody<
  T extends keyof Put = keyof Put,
  K extends Put[T]["url"] = Put[T]["url"],
> = Extract<Put[T], { url: K }>["body"] extends infer Body
  ? Body extends undefined
    ? never
    : Body
  : never;

export type GetRoutesPut<T extends keyof Put> = {
  [P in Put[T]["url"]]: GetRouterObj<Put[T], P>;
};
