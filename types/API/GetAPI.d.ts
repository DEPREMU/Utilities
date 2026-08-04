import {
  Put,
  Post,
  Enums,
  Prisma,
  GetUrlFetch,
  DEFAULT_RESPONSE,
} from "@types";
import { Delete } from "./DeleteAPI";
import { Handler, Router } from "express";
import { PriceBinanceAPI } from "@common";
import { GetParams, GetRouterObj } from "./Helpers";

export type UpdatesFetch =
  | GetUrlFetch<
      "/is-update-available/:version/:buildType",
      {
        version: string;
        buildType: Enums["UpdateType"];
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

export type ClipboardFetch =
  | GetUrlFetch<
      "/:deviceId/:page-number-optional",
      null,
      { auth: true },
      | { clipboardItems: DB["TablesClient"]["ClipboardSync"][] }
      | { error: string }
    >
  | GetUrlFetch<
      "/search/:deviceId/:deleted-boolean/:query-string/:page-number-optional",
      null,
      { auth: true },
      | { clipboardItems: DB["TablesClient"]["ClipboardSync"][] }
      | { error: string }
    >;

export type DownDetectorFetch = GetUrlFetch<
  "/:deviceId/:page-number-optional",
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
      "/page/:page-number-optional",
      null,
      { auth: true },
      { logs?: DB["TablesClient"]["Logs"][]; error?: string }
    >;

export type StreamersFetch =
  | GetUrlFetch<
      "/page/:page-number-optional",
      null,
      {},
      { streamers?: DB["TablesClient"]["Streamers"][]; error?: string }
    >
  | GetUrlFetch<
      "/streamer/:streamerId",
      null,
      {},
      {
        error?: string;
        streamer?: DB["TablesClient"]["Streamers"] & { isLive: boolean };
      }
    >
  | GetUrlFetch<
      "/",
      null,
      {},
      { streamers?: DB["TablesClient"]["Streamers"][]; error?: string }
    >
  | GetUrlFetch<
      "/:userId/:streamerId-optional",
      null,
      {},
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
