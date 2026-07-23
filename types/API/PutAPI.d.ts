import { DEFAULT_RESPONSE, GetRouterObj, GetUrlFetch, Prisma } from "@types";

type LogsFetch = GetUrlFetch<"/", {}, {}, DEFAULT_RESPONSE>;

type UserConfigFetch = GetUrlFetch<
  "/update",
  {
    values: Omit<
      Prisma.UserConfigUpdateInput,
      "id" | "createdAt" | "updatedAt" | "user"
    >;
    deviceId: string;
  },
  { auth: true },
  DEFAULT_RESPONSE
>;

export type ClipboardFetch =
  | GetUrlFetch<
      "/delete/toggle-deleted-all",
      { deviceId: string; restore: boolean },
      { auth: true },
      { error?: string }
    >
  | GetUrlFetch<
      "/delete/toggle-deleted",
      { deviceId: string; id: string; deleted?: boolean },
      { auth: true },
      { error?: string }
    >;

export type DownDetectorFetch = GetUrlFetch<
  "/update",
  {
    id: string;
    values: Omit<Prisma.DownDetectorUpdateInput, "id" | "createdAt" | "user">;
    deviceId: string;
  },
  { auth: true },
  { error?: string }
>;

export type UserNotificationsConfigFetch = GetUrlFetch<
  "/update",
  {
    deviceId: string;
    values: Omit<
      Prisma.UserNotificationConfigUpdateInput,
      "id" | "createdAt" | "updatedAt" | "user"
    >;
    match: Omit<
      Prisma.UserNotificationsConfigWhereInput,
      "id" | "userId" | "user" | "AND" | "OR" | "NOT"
    >;
  },
  { auth: true },
  { error?: string }
>;

export type Put = {
  "/logs": LogsFetch;
  "/clipboard": ClipboardFetch;
  "/user-config": UserConfigFetch;
  "/down-detector": DownDetectorFetch;
  "/user-notifications-config": UserNotificationsConfigFetch;
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
