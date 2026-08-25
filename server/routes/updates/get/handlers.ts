import path from "path";
import chalk from "chalk";
import { getRoutes } from "@/config.ts";
import { dataUpdates, getFinalFileName } from "../variables.ts";
import { File, Logger, STATUS_RESPONSE, getHandlerGet } from "@common";

export const handleIsUpdateAvailable = getHandlerGet(
  "/updates",
  "/is-update-available/:version/:buildType",
  async ({ params }, sendResponse) => {
    const res: Parameters<typeof sendResponse>[1] = {
      latestVersion: "",
      isUpdateAvailable: false,
    };

    try {
      const { version, buildType } = params;

      res.isUpdateAvailable = dataUpdates.isUpdateAvailable(
        version,
        buildType as Parameters<typeof dataUpdates.isUpdateAvailable>[1],
      );
      res.latestVersion =
        dataUpdates.getLatestVersion(
          buildType as Parameters<typeof dataUpdates.getLatestVersion>[0],
        ) || "";

      if (res.isUpdateAvailable) {
        res.downloadUrl = dataUpdates.createTempDownloadUrl(
          version,
          buildType as Parameters<typeof dataUpdates.createTempDownloadUrl>[1],
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
  async ({ params }, sendResponse, { res }) => {
    try {
      const { id } = params;

      const infoUrl = dataUpdates.getInfoTempUrl(id);
      if (!infoUrl)
        return sendResponse(STATUS_RESPONSE.NOT_FOUND, {
          error: "Temporary download URL not found or expired",
        });

      const filePath = path.join(
        getRoutes("UPLOAD_DIR"),
        getFinalFileName({
          version: infoUrl.version,
          buildType: infoUrl.buildType,
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
