import path from "path";
import chalk from "chalk";
import { UPLOAD_DIR } from "@/config.ts";
import { PlatformsOS } from "@types";
import { dataUpdates, getFinalFileName } from "../variables.ts";
import { File, Logger, STATUS_RESPONSE, getHandlerGet } from "@common";

export const handleIsUpdateAvailable = getHandlerGet(
  "/updates",
  "/is-update-available/:version/:buildType/:platform-optional",
  {
    version: "string",
    platform: ["string", "undefined"],
    buildType: "string",
  },
  async (body, sendResponse) => {
    const res: Parameters<typeof sendResponse>[1] = {
      latestVersion: "",
      isUpdateAvailable: false,
    };

    try {
      const { version, buildType, platform } = body;

      res.isUpdateAvailable = dataUpdates.isUpdateAvailable(
        version,
        buildType as Parameters<typeof dataUpdates.isUpdateAvailable>[1],
        platform as PlatformsOS | undefined,
      );
      res.latestVersion =
        dataUpdates.getLatestVersion(
          buildType as Parameters<typeof dataUpdates.getLatestVersion>[0],
          platform as Parameters<typeof dataUpdates.getLatestVersion>[1],
        ) || "";

      if (res.isUpdateAvailable) {
        res.downloadUrl = dataUpdates.createTempDownloadUrl(
          version,
          buildType as Parameters<typeof dataUpdates.createTempDownloadUrl>[1],
          platform as PlatformsOS | undefined,
        );
      }

      sendResponse(STATUS_RESPONSE.SUCCESS, res);
    } catch (error) {
      Logger.error(chalk.red("Error in handleIsUpdateAvailable:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, res);
    }
  },
);

export const handleDownload = getHandlerGet(
  "/updates",
  "/download/:id",
  { id: "string" },
  async (params, sendResponse, { res }) => {
    try {
      const { id } = params;

      const infoUrl = dataUpdates.getInfoTempUrl(id);
      if (!infoUrl)
        return sendResponse(STATUS_RESPONSE.NOT_FOUND, {
          error: "Temporary download URL not found or expired",
        });

      const filePath = path.join(
        UPLOAD_DIR,
        getFinalFileName({
          version: infoUrl.version,
          buildType: infoUrl.buildType,
          platformOS: infoUrl.platformOS,
        }),
      );

      if (!(await new File(filePath).exists()))
        return sendResponse(STATUS_RESPONSE.NOT_FOUND, {
          error: "File not found on server",
        });

      res.download(filePath, (err) => {
        if (!err) return;

        Logger.error("Error downloading file:", err);
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          error: "Error downloading file",
        });
      });
    } catch (error) {
      Logger.error(chalk.red("Error processing download via temp URL:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
      });
    }
  },
);
