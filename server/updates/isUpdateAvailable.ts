/* eslint-disable @stylistic/indent */
import {
  PlatformsOS,
  RequestUploadUpdate,
  ResponseIsUpdateAvailable,
} from "@types";
import data from "./dataUploads.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
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
    return isNaN(versionSum) ? 0 : versionSum;
  } catch {
    return 0;
  }
};

export const handleIsUpdateAvailable = getHandlerPost(
  "/is-update-available",
  {
    buildType: "string",
    platformOS: ["string", "undefined"],
    currentVersion: "string",
  },
  async (body, sendResponse) => {
    const defaultRes: ResponseIsUpdateAvailable = {
      success: false,
      downloadUrl: "",
      latestVersion: "",
      updateAvailable: false,
    };

    try {
      const { currentVersion, buildType: platform, platformOS } = body;
      const buildType = platform as RequestUploadUpdate["buildType"];

      const latestVersionData =
        buildType === "android"
          ? data.new?.[buildType]
          : data.new?.[buildType]?.[
              platformOS as Exclude<PlatformsOS, undefined>
            ] || null;
      if (!latestVersionData) return sendResponse("BAD_REQUEST", defaultRes);

      const latestVersion = latestVersionData.version;
      if (!latestVersion) return sendResponse("BAD_REQUEST", defaultRes);

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

      sendResponse("SUCCESS", {
        success: true,
        downloadUrl,
        latestVersion,
        updateAvailable,
      });
    } catch (error) {
      console.error(
        "Error in handleIsUpdateAvailable:",
        error instanceof Error ? error.message : String(error),
      );
      sendResponse("INTERNAL_SERVER_ERROR", defaultRes);
    }
  },
);
