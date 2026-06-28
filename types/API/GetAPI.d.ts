import { Handler, Router } from "express";
import { GetParams, GetRouterObj } from "./Helpers";
import { PriceBinanceAPI } from "@common";
import {
  BuildTypeUpdates,
  DEFAULT_RESPONSE,
  GetUrlFetch,
  GetUrlFetchOptionalParameter,
  PlatformsOS,
  Post,
  Prisma,
  ResponseDownloadUpload,
} from "@types";
import { Delete } from "./DeleteAPI";

export type UpdatesFetch =
  | GetUrlFetch<
      "/is-update-available/:version/:buildType/:platform-optional",
      {
        version: string;
        buildType: BuildTypeUpdates;
        platform?: PlatformsOS;
      },
      {},
      {
        downloadUrl?: string;
        latestVersion: string;
        isUpdateAvailable: boolean;
      }
    >
  | GetUrlFetch<"/download/:id", null, {}, ResponseDownloadUpload>;

export type CryptosFetch =
  | GetUrlFetch<"/", null, {}, { cryptos: PriceBinanceAPI; error?: string }>
  | GetUrlFetch<
      "/:symbol",
      null,
      {},
      { crypto: PriceBinanceAPI[0] | null; error?: string }
    >
  | GetUrlFetch<
      "/price/:symbol",
      null,
      {},
      { price: number; priceMXN?: number } | { error: string }
    >;

export type ServerInfoFetch =
  | GetUrlFetch<"/health", null, {}, { upTime: number; timestamp: string }>
  | GetUrlFetch<"/generate204", null, {}, "">
  | GetUrlFetch<
      "/appAlive/:deviceId-string/:pushToken-string",
      null,
      {},
      DEFAULT_RESPONSE
    >;

export type LogsFetch =
  | GetUrlFetch<
      "/",
      null,
      { auth: true },
      { logs: DB["Tables"]["Logs"][] } | { error: string }
    >
  | GetUrlFetch<
      "/page/:page-number-optional",
      null,
      { auth: true },
      { logs?: DB["Tables"]["Logs"][]; error?: string }
    >;

export type ResponseStreamersFetch = Prisma.StreamersGetPayload<{
  omit: { createdAt: true };
}>;

export type StreamersFetch =
  | GetUrlFetch<
      "/page/:page-number-optional",
      null,
      {},
      { streamers?: ResponseStreamersFetch[]; error?: string }
    >
  | GetUrlFetch<
      "/streamer/:streamerId",
      null,
      {},
      {
        error?: string;
        streamer?: ResponseStreamersFetch & { isLive: boolean };
      }
    >
  | GetUrlFetch<
      "/",
      null,
      {},
      { streamers?: ResponseStreamersFetch[]; error?: string }
    >
  | GetUrlFetch<
      "/add/:userId/:streamerName",
      null,
      {},
      {
        error?: string;
        streamer?: ResponseStreamersFetch & { isLive: boolean };
      }
    >
  | GetUrlFetch<
      "/:userId/:streamerId-optional",
      null,
      {},
      {
        error?: string;
        streamers?: (ResponseStreamersFetch & { isLive: boolean })[];
      }
    >;

export type Get = {
  "/info": ServerInfoFetch;
  "/logs": LogsFetch;
  "/cryptos": CryptosFetch;
  "/updates": UpdatesFetch;
  "/streamers": StreamersFetch;
};

export type GetRoutesGet<T extends keyof Get> = {
  [P in Get[T]["url"]]: GetRouterObj<Get[T], P>;
};

export type GetMainRouter = {
  [P in keyof Get | keyof Post | keyof Delete]: {
    router: Router;
  };
};
