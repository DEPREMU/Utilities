/* eslint-disable @stylistic/indent */
import {
  PlatformsOS,
  RequestUploadUpdate,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
} from "@types";
import data from "./dataUploads.ts";
import { sendResponse } from "@common";
import { Request, Response } from "express";
import { createTempDownloadUrl } from "./tempDownloadUrl.ts";

const getSumVersion = (version: string): number => {
  try {
    const versionSum = version
      .split(".")
      .map((num) => {
        const number = Number(num);
        return !isNaN(number) ? number : 0;
      })
      .reduce((sum, part, index) => sum + part * Math.pow(1000, 2 - index), 0);
    return versionSum;
  } catch {
    return 0;
  }
};

export const handleIsUpdateAvailable = (
  req: Request<unknown, unknown, RequestIsUpdateAvailable>,
  res: Response<ResponseIsUpdateAvailable>,
) => {
  if (!sendResponse) return;

  const defaultRes: ResponseIsUpdateAvailable = {
    updateAvailable: false,
    latestVersion: "",
    downloadUrl: "",
  };

  try {
    const { currentVersion, buildType, platformOS } = req.body || {};

    if (!currentVersion || !buildType)
      return sendResponse(
        res,
        "BAD_REQUEST",
        defaultRes,
        "/is-update-available",
      );

    const latestVersionData =
      buildType === "android"
        ? data.new?.[buildType]
        : data.new?.[buildType]?.[
            platformOS as Exclude<PlatformsOS, undefined>
          ] || null;
    if (!latestVersionData)
      return sendResponse(
        res,
        "BAD_REQUEST",
        defaultRes,
        "/is-update-available",
      );

    const latestVersion = latestVersionData.version;
    if (!latestVersion || latestVersion === "unknown")
      return sendResponse(
        res,
        "BAD_REQUEST",
        defaultRes,
        "/is-update-available",
      );

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

    sendResponse(
      res,
      "SUCCESS",
      { downloadUrl, latestVersion, updateAvailable },
      "/is-update-available",
    );
  } catch (error) {
    console.error(
      "Error in handleIsUpdateAvailable:",
      error instanceof Error ? error.message : String(error),
    );
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      defaultRes,
      "/is-update-available",
    );
  }
};
