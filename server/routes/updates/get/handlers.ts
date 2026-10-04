import path from "path";
import chalk from "chalk";
import { config } from "@/config";
import { RequestError } from "@commonSrc/both/errors/Error";
import { sendAccelRedirect } from "../downloads";
import { dataUpdates, getFinalFileName } from "../variables";
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
      res.latestVersion = dataUpdates.getLatestVersion(buildType) || "";

      if (res.isUpdateAvailable) {
        res.downloadUrl = dataUpdates.createTempDownloadUrl(
          res.latestVersion,
          buildType,
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
  async ({ params }, _sendResponse, { res }) => {
    const { id } = params;

    const infoUrl = dataUpdates.getInfoTempUrl(id);
    if (!infoUrl)
      throw new RequestError(
        STATUS_RESPONSE.NOT_FOUND,
        "Temporary download URL not found or expired",
      );

    const filename = getFinalFileName({
      version: infoUrl.version,
      buildType: infoUrl.buildType,
    });

    if (path.basename(filename) !== filename)
      throw new RequestError(STATUS_RESPONSE.BAD_REQUEST, "Invalid file name");

    const uploadDir = path.resolve(config.getRoutes("UPLOAD_DIR"));
    const filePath = path.resolve(uploadDir, filename);

    if (!filePath.startsWith(uploadDir))
      throw new RequestError(STATUS_RESPONSE.BAD_REQUEST, "Invalid file path");

    const file = new File(filePath);
    const stats = await file.stats();

    if (!stats || !stats.isFile())
      throw new RequestError(
        STATUS_RESPONSE.NOT_FOUND,
        "File not found on server",
      );

    await sendAccelRedirect(res, filePath, filename);
  },
);
