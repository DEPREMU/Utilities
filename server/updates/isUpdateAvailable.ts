import {
  PlatformsOS,
  RequestUploadUpdate,
  ResponseIsUpdateAvailable,
} from "@types";
import data from "./dataUploads.ts";
import { showError } from "../functions/logger.ts";
import { getSumVersion } from "@common";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { createTempDownloadUrl } from "./tempDownloadUrl.ts";

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
