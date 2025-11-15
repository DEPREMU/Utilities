export type UpdatesRoutes =
  | "/is-update-available"
  | "/upload-update"
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

export type RequestIsUpdateAvailable<
  T extends BuildTypeUpdates = BuildTypeUpdates
> = {
  buildType: T;
  currentVersion: string;
  platformOS: T extends "android" ? undefined : PlatformsOS;
};

export type ResponseIsUpdateAvailable = {
  updateAvailable: boolean;
  latestVersion: string;
  downloadUrl: string;
};

export type RequestUploadUpdate = {
  buildType: BuildTypeUpdates;
  version: string;
  platformOS: PlatformsOS;
  timestamp: number;
};

export type RequestCreateTempDownloadUrl = {
  buildType: BuildTypeUpdates;
  version: string;
};

export type ResponseCreateTempDownloadUrl = {
  url: string;
};

export type RequestDownloadViaTempUrl = {
  buildType: BuildTypeUpdates;
  platformOS: PlatformsOS;
  version: string;
  id: string;
};

export type ResponseDownloadUpload = {
  error?: string;
};
