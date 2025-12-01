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
  const defaultRes: ResponseIsUpdateAvailable = {
    updateAvailable: false,
    latestVersion: "",
    downloadUrl: "",
  };

  try {
    const { currentVersion, buildType, platformOS } = req.body || {};

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
  } catch (error) {
    console.error(
      "Error in handleIsUpdateAvailable:",
      error instanceof Error ? error.message : String(error),
    );
    try {
      res.status(500).json(defaultRes);
    } catch (error) {
      console.error(
        "Error sending error response in handleIsUpdateAvailable:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
};
