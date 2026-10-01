import { Router } from "express";
import { Delete } from "./DeleteAPI";
import { GetRouterObj } from "./Helpers";
import { PriceBinanceAPI } from "@common";
import { Put, Post, Enums, GetUrlFetch, ResponseHealth } from "@types";

export type UpdatesFetch =
  | GetUrlFetch<
      "/is-update-available/:version/:buildType",
      {
        params: {
          version: string;
          buildType: Enums["UpdateType"];
        };
      },
      Record<string, never>,
      {
        downloadUrl?: string;
        latestVersion: string;
        isUpdateAvailable: boolean;
      }
    >
  | GetUrlFetch<
      "/download/:id",
      { params: { id: string } },
      Record<string, never>
    >;

export type CryptosFetch =
  | GetUrlFetch<
      "/",
      null,
      { canBeUnavailableService: true },
      { cryptos: PriceBinanceAPI }
    >
  | GetUrlFetch<
      "/:symbol",
      null,
      { canBeUnavailableService: true },
      { crypto: PriceBinanceAPI[0] | null }
    >
  | GetUrlFetch<
      "/price/:symbol",
      null,
      { canBeUnavailableService: true },
      { price: number; priceMXN?: number }
    >;

export type ServerInfoFetch =
  | GetUrlFetch<"/health", null, Record<string, never>, ResponseHealth>
  | GetUrlFetch<"/generate204", null, Record<string, never>, "">
  | GetUrlFetch<"/appAlive/:deviceId/:pushToken", null, Record<string, never>>;

export type ClipboardFetch = GetUrlFetch<
  "/:deviceId{/:page-number}?deleted-boolean-optional;query-optional;",
  null,
  { auth: true },
  { clipboardItems: DB["TablesClient"]["ClipboardSync"][] }
>;

export type DownDetectorFetch = GetUrlFetch<
  "/:deviceId{/:page-number}",
  null,
  { auth: true },
  { downDetectors: DB["TablesClient"]["DownDetector"][] }
>;

export type LogsFetch =
  | GetUrlFetch<
      "/",
      null,
      { auth: true },
      { logs: DB["TablesClient"]["Logs"][] }
    >
  | GetUrlFetch<
      "/page{/:page-number}",
      null,
      { auth: true },
      { logs: DB["TablesClient"]["Logs"][] }
    >;

export type StreamersFetch =
  | GetUrlFetch<
      "/page{/:page-number}",
      null,
      Record<string, never>,
      { streamers: DB["TablesClient"]["Streamers"][] }
    >
  | GetUrlFetch<
      "/streamer/:streamerId",
      null,
      Record<string, never>,
      {
        streamer: DB["TablesClient"]["Streamers"] & { isLive: boolean };
      }
    >
  | GetUrlFetch<
      "/",
      null,
      Record<string, never>,
      { streamers: DB["TablesClient"]["Streamers"][] }
    >
  | GetUrlFetch<
      "/:userId{/:streamerId}",
      null,
      Record<string, never>,
      {
        streamers: (DB["TablesClient"]["Streamers"] & { isLive: boolean })[];
      }
    >;

export type Get = {
  "/info": ServerInfoFetch;
  "/logs": LogsFetch;
  "/cryptos": CryptosFetch;
  "/updates": UpdatesFetch;
  "/streamers": StreamersFetch;
  "/clipboard": ClipboardFetch;
  "/down-detector": DownDetectorFetch;
};

export type GetRoutesGet<T extends keyof Get> = {
  [P in Get[T]["url"]]: GetRouterObj<Get[T], P>;
};

export type GetMainRouter = {
  [P in keyof Get | keyof Post | keyof Delete | keyof Put]: {
    router: Router;
  };
};
