/* eslint-disable @stylistic/indent */
import {
  PlatformsOS,
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
} from "@types";
import data from "./dataUploads";
import { Request, Response } from "express";
import { createTempDownloadUrl } from "./tempDownloadUrl";

const getSumVersion = (version: string): number => {
  const [major, minor, patch] = version
    .split(".")
    .map((num) => parseInt(num, 10));
  return major * 10000 + minor * 100 + patch;
};

export const handleIsUpdateAvailable = (
  req: Request<unknown, unknown, RequestIsUpdateAvailable>,
  res: Response<ResponseIsUpdateAvailable>,
) => {
  const { currentVersion, buildType, platformOS } = req.body || {};

  const defaultRes: ResponseIsUpdateAvailable = {
    updateAvailable: false,
    latestVersion: "",
    downloadUrl: "",
  };

  if (!currentVersion || !buildType) {
    res.status(400).json(defaultRes);
    return;
  }

  const latestVersionData =
    buildType === "android"
      ? data.new?.[buildType]
      : data.new?.[buildType]?.[
          platformOS as Exclude<PlatformsOS, undefined>
        ] || null;
  if (!latestVersionData) {
    res.status(400).json(defaultRes);
    return;
  }

  const latestVersion = latestVersionData.version;
  if (!latestVersion || latestVersion === "unknown") {
    res.status(400).json(defaultRes);
    return;
  }

  let downloadUrl = "";
  if (buildType === "android") {
    downloadUrl = createTempDownloadUrl({
      buildType: "android",
      platformOS: undefined,
      timestamp: 0,
      version: latestVersion,
    });
  } else {
    downloadUrl = createTempDownloadUrl({
      buildType: buildType as Exclude<
        RequestUploadUpdate["buildType"],
        "android"
      >,
      platformOS: platformOS as PlatformsOS,
      timestamp: 0,
      version: latestVersion,
    });
  }

  const updateAvailable =
    getSumVersion(latestVersion) > getSumVersion(currentVersion);

  res.status(200).json({
    downloadUrl,
    latestVersion,
    updateAvailable,
  });
};
