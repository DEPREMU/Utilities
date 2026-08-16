import { Router } from "express";
import { Delete } from "./DeleteAPI";
import { GetRouterObj } from "./Helpers";
import { PriceBinanceAPI } from "@common";
import {
  Put,
  Post,
  Enums,
  GetUrlFetch,
  DEFAULT_RESPONSE,
  ResponseHealth,
} from "@types";

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
      Record<string, never>,
      { error: string }
    >;

export type CryptosFetch =
  | GetUrlFetch<
      "/",
      null,
      { canBeUnavailableService: true },
      { cryptos: PriceBinanceAPI; error?: string }
    >
  | GetUrlFetch<
      "/:symbol",
      null,
      { canBeUnavailableService: true },
      { crypto: PriceBinanceAPI[0] | null; error?: string }
    >
  | GetUrlFetch<
      "/price/:symbol",
      null,
      { canBeUnavailableService: true },
      { price: number; priceMXN?: number } | { error: string }
    >;

export type ServerInfoFetch =
  | GetUrlFetch<"/health", null, Record<string, never>, ResponseHealth>
  | GetUrlFetch<"/generate204", null, Record<string, never>, "">
  | GetUrlFetch<
      "/appAlive/:deviceId/:pushToken",
      null,
      Record<string, never>,
      DEFAULT_RESPONSE
    >;

export type ClipboardFetch =
  | GetUrlFetch<
      "/:deviceId{/:page-number}",
      null,
      { auth: true },
      | { clipboardItems: DB["TablesClient"]["ClipboardSync"][] }
      | { error: string }
    >
  | GetUrlFetch<
      "/search/:deviceId/:query{/:page-number}?deleted-boolean-optional",
      null,
      { auth: true },
      | { clipboardItems: DB["TablesClient"]["ClipboardSync"][] }
      | { error: string }
    >;

export type DownDetectorFetch = GetUrlFetch<
  "/:deviceId{/:page-number}",
  null,
  { auth: true },
  { downDetectors: DB["TablesClient"]["DownDetector"][] } | { error: string }
>;

export type LogsFetch =
  | GetUrlFetch<
      "/",
      null,
      { auth: true },
      { logs: DB["TablesClient"]["Logs"][] } | { error: string }
    >
  | GetUrlFetch<
      "/page{/:page-number}",
      null,
      { auth: true },
      { logs?: DB["TablesClient"]["Logs"][]; error?: string }
    >;

export type StreamersFetch =
  | GetUrlFetch<
      "/page{/:page-number}",
      null,
      Record<string, never>,
      { streamers?: DB["TablesClient"]["Streamers"][]; error?: string }
    >
  | GetUrlFetch<
      "/streamer/:streamerId",
      null,
      Record<string, never>,
      {
        error?: string;
        streamer?: DB["TablesClient"]["Streamers"] & { isLive: boolean };
      }
    >
  | GetUrlFetch<
      "/",
      null,
      Record<string, never>,
      { streamers?: DB["TablesClient"]["Streamers"][]; error?: string }
    >
  | GetUrlFetch<
      "/:userId{/:streamerId}",
      null,
      Record<string, never>,
      {
        error?: string;
        streamers?: (DB["TablesClient"]["Streamers"] & { isLive: boolean })[];
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
