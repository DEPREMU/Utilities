import {
  Prisma,
  GetUrlFetch,
  RequestAuth,
  ResponseAuth,
  RequestDoQuery,
  ResponseSignOut,
  ResponseDoQuery,
  RequestRefreshSession,
  RequestChangeImageFormat,
  ResponseChangeImageFormat,
} from "@types";
import { GetRouterObj } from "./Helpers";
import { RequestSignOut } from "./Request";

export type AuthFetch =
  | GetUrlFetch<
      "/login",
      { body: RequestAuth<"login"> },
      Record<string, never>,
      ResponseAuth<"login">
    >
  | GetUrlFetch<
      "/signup",
      { body: RequestAuth<"signup"> },
      Record<string, never>,
      ResponseAuth<"signup">
    >
  | GetUrlFetch<
      "/signout",
      { body: RequestSignOut },
      { auth: true },
      ResponseSignOut
    >
  | GetUrlFetch<
      "/refreshSession",
      { body: RequestRefreshSession },
      { auth: true },
      ResponseAuth<"login">
    >;

export type DevFetch = GetUrlFetch<
  "/executeQuery",
  { body: RequestDoQuery },
  Record<string, never>,
  ResponseDoQuery
>;

export type LogsFetch = GetUrlFetch<
  "/add",
  { body: Prisma.LogsCreateArgs["data"] },
  Record<string, never>
>;

export type EncryptionFetch = GetUrlFetch<
  "/encrypt" | "/decrypt",
  { body: { value: string } },
  Record<string, never>,
  { value?: string; error?: string }
>;

export type TranslateFetch = GetUrlFetch<
  "/translate",
  { body: { text: string; targetLanguage: string } },
  Record<string, never>,
  { translatedText?: string; error?: string }
>;

export type UpdatesFetch = GetUrlFetch<"/upload", null, Record<string, never>>;

export type ImagesFetch = GetUrlFetch<
  "/change-format",
  { body: RequestChangeImageFormat },
  Record<string, never>,
  ResponseChangeImageFormat
>;

export type DownDetectorFetch = GetUrlFetch<
  "/add",
  {
    body: {
      deviceId: string;
      values: Omit<
        DB["TablesClient"]["DownDetector"],
        "id" | "userId" | "createdAt"
      >;
    };
  },
  { auth: true },
  DB["TablesClient"]["DownDetector"] | { error: string }
>;

export type ClipboardFetch = GetUrlFetch<
  "/add",
  { body: { deviceId: string; content: string } },
  { auth: true },
  DB["TablesClient"]["ClipboardSync"] | { error: string }
>;

export type StreamersFetch = GetUrlFetch<
  "/add",
  {
    body: {
      userId: string;
      deviceId: string;
      streamerName: string;
    };
  },
  { auth: true },
  {
    error?: string;
    streamer?: Omit<DB["TablesClient"]["Streamers"], "createdAt"> & {
      isLive: boolean;
    };
  }
>;

export type AdminFetch = GetUrlFetch<
  "/unlock",
  { body: { deviceId: string; password: string } },
  { auth: true },
  { error?: string; success?: boolean }
>;

export type Post = {
  "/dev": DevFetch;
  "/auth": AuthFetch;
  "/logs": LogsFetch;
  "/admin": AdminFetch;
  "/images": ImagesFetch;
  "/updates": UpdatesFetch;
  "/languages": TranslateFetch;
  "/clipboard": ClipboardFetch;
  "/streamers": StreamersFetch;
  "/encryption": EncryptionFetch;
  "/down-detector": DownDetectorFetch;
};

export type RequestBody<
  T extends keyof Post = keyof Post,
  K extends Post[T]["url"] = Post[T]["url"],
> = Extract<Post[T], { url: K }>["body"] extends infer Body
  ? Body extends undefined
    ? never
    : Body
  : never;

export type GetRoutesPost<T extends keyof Post> = {
  [P in Post[T]["url"]]: GetRouterObj<Post[T], P>;
};
