import {
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
} from "@types";
import data from "./dataUploads";
import { Request, Response } from "express";
import { createTempDownloadUrl } from "./tempDownloadUrl";

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

  if (!currentVersion || !buildType || !platformOS) {
    res.status(400).json(defaultRes);
    return;
  }

  const latestVersionData =
    buildType === "android"
      ? data.new?.[buildType]
      : data.new?.[buildType]?.[platformOS] || null;
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
      platformOS,
      timestamp: 0,
      version: latestVersion,
    });
  }
  const updateAvailable = latestVersion !== currentVersion;

  res.status(200).json({
    downloadUrl,
    latestVersion,
    updateAvailable,
  });
};
