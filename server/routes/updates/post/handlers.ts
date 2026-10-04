import {
  File,
  Logger,
  Directory,
  getHandlerPost,
  STATUS_RESPONSE,
} from "@common";
import path from "path";
import Busboy from "busboy";
import { config } from "@/config";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { RequestUploadUpdate } from "@types";
import { dataUpdates, getFinalFileName } from "../variables";

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const VALID_BUILD_TYPES = new Set<RequestUploadUpdate["buildType"]>([
  "web",
  "linux",
  "android",
  "windows",
]);

export const handleUpload = getHandlerPost(
  "/updates",
  "/upload",
  async (_, sendResponse, { req }) => {
    const uploadDir = path.resolve(config.getRoutes("UPLOAD_DIR"));

    let dataFile: RequestUploadUpdate | null = null;
    let isNewVersion = false;

    let responseSent = false;
    let clientAborted = false;

    let fileTooLarge = false;
    let receivedFileCount = 0;
    let uploadError: unknown = null;

    const uploads: Promise<void>[] = [];
    const tempFiles = new Set<File>();

    const controller = new AbortController();

    const respond: typeof sendResponse = (...args): void => {
      if (responseSent || clientAborted) return;

      responseSent = true;

      sendResponse(...args);
    };

    const cleanupTempFiles = async (): Promise<void> => {
      if (tempFiles.size === 0) return;

      const files = [...tempFiles];
      tempFiles.clear();

      await Promise.allSettled(files.map((file) => file.rm()));
    };

    const abortRequest = async (): Promise<void> => {
      if (clientAborted) return;

      clientAborted = true;

      try {
        controller.abort();
      } catch {
        // AbortController already aborted.
      }

      await cleanupTempFiles();
    };

    req.once("aborted", () => {
      void abortRequest();
    });

    req.once("error", (error) => {
      Logger.error("Request stream error:", error);
      void abortRequest();
    });

    try {
      await new Directory(uploadDir).mkdir({ recursive: true });

      const busboy = Busboy({
        headers: req.headers,

        limits: {
          fileSize: MAX_FILE_SIZE,
          files: 1,
          fields: 20,
        },
      });

      busboy.on("field", (fieldName, value) => {
        if (fieldName !== "data") return;

        try {
          if (dataFile !== null) {
            Logger.error("Duplicate data field");
            isNewVersion = false;
            dataFile = null;
            return;
          }

          const parsed = JSON.parse(value) as RequestUploadUpdate;

          if (
            !parsed ||
            typeof parsed !== "object" ||
            !VALID_BUILD_TYPES.has(parsed.buildType)
          ) {
            Logger.error("Invalid platform or OS");
            dataFile = null;
            isNewVersion = false;
            return;
          }

          dataFile = parsed;

          const existingData = dataUpdates.getDataUpdate(parsed.buildType);

          if (!existingData) {
            isNewVersion = true;
            return;
          }

          if (parsed.version === existingData.version) {
            Logger.log("Version already exists:", parsed.version);

            isNewVersion = false;
            return;
          }

          isNewVersion = true;
        } catch (error) {
          Logger.error("Invalid JSON:", error);
          dataFile = null;
          isNewVersion = false;
        }
      });

      busboy.on("file", (_, file) => {
        receivedFileCount++;

        file.on("limit", () => {
          fileTooLarge = true;

          Logger.error(`Upload exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB`);
        });

        const tempFile = new File(
          path.join(uploadDir, `.upload-${randomUUID()}.tmp`),
        );

        tempFiles.add(tempFile);

        try {
          const writeStream = tempFile.createStream.write();

          const uploadPromise = pipeline(file, writeStream, {
            signal: controller.signal,
          });

          uploads.push(uploadPromise);

          void uploadPromise.catch((error) => {
            uploadError ??= error;

            Logger.error("Error writing uploaded file:", error);
          });
        } catch (error) {
          uploadError ??= error;

          Logger.error("Error initializing file upload:", error);

          file.resume();
        }
      });

      busboy.on("filesLimit", () => {
        Logger.error("More than one file was uploaded");
        receivedFileCount++;
      });

      busboy.once("error", (error) => {
        Logger.error("Busboy error:", error);

        uploadError ??= error;

        try {
          controller.abort();
        } catch {
          // Ignore if already aborted.
        }
      });

      busboy.once("finish", async () => {
        if (clientAborted || responseSent) return;

        try {
          const results = await Promise.allSettled(uploads);

          if (clientAborted || responseSent) return;

          const rejectedUpload = results.find(
            (result) => result.status === "rejected",
          );

          if (uploadError || rejectedUpload?.status === "rejected") {
            const error =
              uploadError ??
              (rejectedUpload?.status === "rejected"
                ? rejectedUpload.reason
                : null);

            Logger.error("Upload failed:", error);

            await cleanupTempFiles();

            respond(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
              error: "Error uploading files",
              success: false,
            });

            return;
          }

          if (fileTooLarge) {
            await cleanupTempFiles();

            respond(STATUS_RESPONSE.BAD_REQUEST, {
              error: "Upload exceeds 500 MB",
              success: false,
            });

            return;
          }

          if (!dataFile) {
            await cleanupTempFiles();

            respond(STATUS_RESPONSE.BAD_REQUEST, {
              error: "Missing or invalid data field",
              success: false,
            });

            return;
          }

          if (!isNewVersion) {
            await cleanupTempFiles();

            respond(STATUS_RESPONSE.FORBIDDEN, {
              error: "Version already exists or invalid platform/OS",
              success: false,
            });

            return;
          }

          if (receivedFileCount !== 1) {
            await cleanupTempFiles();

            respond(STATUS_RESPONSE.BAD_REQUEST, {
              error: "Exactly one file is required",
              success: false,
            });

            return;
          }

          const tempPath = [...tempFiles][0];

          if (!tempPath) {
            respond(STATUS_RESPONSE.BAD_REQUEST, {
              error: "Missing uploaded file",
              success: false,
            });

            return;
          }

          const finalName = getFinalFileName(dataFile);

          if (path.basename(finalName) !== finalName) {
            throw new Error("Invalid final file name");
          }

          const finalPath = path.join(uploadDir, finalName);

          Logger.log(`Moving upload to: ${finalPath}`);

          await tempPath.rename(finalPath);

          tempFiles.delete(tempPath);

          const success = await dataUpdates.updateDataUploads(
            dataFile.version,
            dataFile.buildType,
          );

          Logger.log("All files written successfully");

          respond(STATUS_RESPONSE.SUCCESS, {
            success,
          });
        } catch (error) {
          Logger.error("Error handling upload:", error);

          await cleanupTempFiles();

          if (clientAborted || responseSent) return;

          respond(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
            error: "Internal server error",
            success: false,
          });
        }
      });

      req.pipe(busboy);
    } catch (error) {
      Logger.error("Error handling upload:", error);

      await cleanupTempFiles();

      if (clientAborted || responseSent) return;

      respond(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
        success: false,
      });
    }
  },
);
