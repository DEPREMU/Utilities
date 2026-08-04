import path from "path";
import chalk from "chalk";
import Busboy from "busboy";
import { getRoutes } from "@/config";
import { RequestUploadUpdate } from "@types";
import { dataUpdates, getFinalFileName } from "../variables";
import { File, Logger, STATUS_RESPONSE, getHandlerPost } from "@common";

export const handleUpload = getHandlerPost(
  "/updates",
  "/upload",
  {},
  async (_, sendResponse, { req }) => {
    try {
      const busboy = Busboy({ headers: req.headers });
      const uploads: Promise<void>[] = [];
      let dataFile: RequestUploadUpdate | null = null;
      let isNewVersion = false;
      let connectionClosed = false;

      busboy.on("field", (fieldName, val) => {
        if (fieldName !== "data") return;

        try {
          dataFile = JSON.parse(val) as RequestUploadUpdate;

          const existingData = dataUpdates.getDataUpdate(dataFile.buildType);

          if (!existingData) {
            Logger.log("Invalid platform or OS");
            isNewVersion = false;
            return;
          }

          if (dataFile.version === existingData.version) {
            Logger.log("Version already exists:", dataFile.version);
            isNewVersion = false;
            return;
          }

          isNewVersion = true;
        } catch {
          Logger.error("JSON not valid");
        }
      });

      busboy.on("file", (_, file) => {
        if (!dataFile || !isNewVersion) {
          Logger.log("Version not new, discarding file...");

          file.on("end", () => {
            if (connectionClosed) return;

            connectionClosed = true;
            sendResponse(STATUS_RESPONSE.FORBIDDEN, {
              error: "Version already exists or invalid platform/OS",
              success: false,
            });
          });
          file.resume();
          return;
        }

        const finalName = getFinalFileName(dataFile);
        const saveTo = path.join(getRoutes("UPLOAD_DIR"), finalName);

        Logger.log(`Saving file to: ${saveTo}`);

        const fileToSave = new File(saveTo);
        const writeStream = fileToSave.createWriteStream();

        const uploadPromise = new Promise<void>((resolve, reject) => {
          file.pipe(writeStream);

          file.on("end", resolve);
          file.on("error", (err) => {
            Logger.error("Error in file stream:", err);
            writeStream.destroy();
            fileToSave.rm();
            reject(err);
          });

          writeStream.on("finish", resolve);
          writeStream.on("error", (err) => {
            Logger.error("Error writing file:", err);
            file.unpipe(writeStream);
            fileToSave.rm();
            reject(err);
          });
        });

        uploads.push(uploadPromise);
      });

      busboy.on("finish", async () => {
        if (!dataFile)
          return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
            error: "Missing or invalid data field",
            success: false,
          });

        if (!isNewVersion) return;

        try {
          await Promise.all(uploads);

          const success = await dataUpdates.updateDataUploads(
            dataFile.version,
            dataFile.buildType,
          );
          Logger.log("All files written successfully");

          sendResponse(STATUS_RESPONSE.SUCCESS, { success });
        } catch (err) {
          Logger.error("Error uploading:", err);
          if (connectionClosed) return;
          sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
            error: "Error uploading files",
            success: false,
          });
        }
      });

      req.pipe(busboy);
    } catch (error) {
      Logger.error(chalk.red("Error handling upload:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
        success: false,
      });
    }
  },
);
