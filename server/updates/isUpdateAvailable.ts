import {
  PlatformsOS,
  RequestUploadUpdate,
  ResponseIsUpdateAvailable,
} from "@types";
import data from "./dataUploads.ts";
import { showError } from "../functions/logger.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { createTempDownloadUrl } from "./tempDownloadUrl.ts";

const getSumVersion = (version: string): number => {
  try {
    const versionSum = version
      .split(".")
      .map((num) => {
        let number = Number(num);
        if (isNaN(number)) {
          // Handle cases like "1.0.0-beta"
          const match = num.match(/^(\d+)/);

          if (match) number = Number(match[1]);
          else return 0;
        }
        return number;
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
          version: latestVersion,
        });
      } else {
        downloadUrl = createTempDownloadUrl({
          buildType: buildType as Exclude<
            RequestUploadUpdate["buildType"],
            "android"
          >,
          platformOS: platformOS as PlatformsOS,
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
      showError(
        "Error in handleIsUpdateAvailable:",
        error instanceof Error ? error.message : String(error),
      );
      sendResponse("INTERNAL_SERVER_ERROR", defaultRes);
    }
  },
);
