import {
  Prisma,
  GetUrlFetch,
  RequestAuth,
  ResponseAuth,
  RequestDoQuery,
  ResponseSignOut,
  ResponseDoQuery,
  RequestRefreshSession,
} from "@types";
import type { Handler } from "express";
import { RequestSignOut } from "./Request";
import { GetRouterObj, DEFAULT_RESPONSE } from "./Helpers";

export type AuthFetch =
  | GetUrlFetch<"/login", RequestAuth<"login">, {}, ResponseAuth<"login">>
  | GetUrlFetch<"/signout", RequestSignOut, {}, ResponseSignOut>
  | GetUrlFetch<"/signup", RequestAuth<"signup">, {}, ResponseAuth<"signup">>
  | GetUrlFetch<
      "/refreshSession",
      RequestRefreshSession,
      {},
      ResponseAuth<"login">
    >;

export type DevFetch = GetUrlFetch<
  "/executeQuery",
  RequestDoQuery,
  {},
  ResponseDoQuery
>;

export type LogsFetch = GetUrlFetch<
  "/add",
  Prisma.LogsCreateArgs["data"],
  {},
  DEFAULT_RESPONSE
>;

export type EncryptionFetch = GetUrlFetch<
  "/encrypt" | "/decrypt",
  { value: string },
  {},
  { value?: string; error?: string }
>;

export type TranslateFetch = GetUrlFetch<
  "/translate",
  { text: string; targetLanguage: string },
  {},
  { translatedText?: string; error?: string }
>;

export type UpdatesFetch = GetUrlFetch<"/upload", {}, {}, DEFAULT_RESPONSE>;

export type Post = {
  "/dev": DevFetch;
  "/auth": AuthFetch;
  "/logs": LogsFetch;
  "/updates": UpdatesFetch;
  "/languages": TranslateFetch;
  "/encryption": EncryptionFetch;
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
  [P in Post[T]["url"]]: GetRouterObj;
};
