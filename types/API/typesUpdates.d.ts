import { RequestIsUpdateAvailable } from "./Request";
import { ResponseIsUpdateAvailable } from "./Response";
import { MethodsAvailableInAPI } from "./typesAPI";

export type UpdatesRoutes =
  | "/web-page"
  | "/upload-update"
  | "/is-update-available"
  | "/download/:buildType/:version/:platformOS/:id";

export type PlatformsOS = "linux" | "windows";
export type BuildTypeUpdates = "web" | "electron" | "android";

export type UpdateInfo = {
  version: string;
  timestamp: number;
};

export type PlatformsOSUpdates = Record<PlatformsOS, UpdateInfo>;

export type CommonData = {
  [key in BuildTypeUpdates]: key extends "android"
    ? UpdateInfo
    : PlatformsOSUpdates;
};

export type DataUpdates = {
  old: CommonData;
  new: CommonData;
};

export type ResponseDownloadUpload = {
  error?: string;
};

export type IsUpdateAvailableFetch = {
  url: "/is-update-available";
  body: RequestIsUpdateAvailable;
  method: MethodsAvailableInAPI["post"];
  response: ResponseIsUpdateAvailable;
};
export type UploadUpdateFetch = {
  url: "/upload-update";
  body: undefined;
  method: MethodsAvailableInAPI["post"];
  response: ResponseIsUpdateAvailable;
};
export type DownloadViaTempUrlFetch = {
  url: "/download/:buildType/:version/:platformOS/:id";
  body: unknown;
  method: MethodsAvailableInAPI["get"];
  response: unknown;
};
export type DownloadUploadFetch = {
  url: "/download/:buildType/:version/:platformOS/:id";
  body: unknown;
  method: MethodsAvailableInAPI["get"];
  response: unknown;
};
export type WebPageFetch = {
  url: "/web-page";
  body: unknown;
  method: MethodsAvailableInAPI["get"];
  response: unknown;
};
