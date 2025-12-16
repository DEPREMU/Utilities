/* eslint-disable @stylistic/indent */
import {
  UpdateInfo,
  PlatformsOS,
  PlatformsOSUpdates,
  RequestUploadUpdate,
} from "@types";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import Busboy from "busboy";
import { UPLOAD_DIR } from "../config.ts";
import { sendResponse } from "@common";
import { Request, Response } from "express";
import dataUploads, { updateDataUploads } from "./dataUploads.ts";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const getFinalFileName = (
  dataFile: Omit<RequestUploadUpdate, "timestamp">,
) => {
  let extension = "";
  if (dataFile.buildType === "android") extension = ".apk";
  else if (dataFile.buildType === "web") extension = ".html";
  else if (dataFile.platformOS === "windows") extension = ".exe";
  else extension = ".deb";

  return `${dataFile.version}-${dataFile.buildType}-${extension === ".apk" ? "android" : dataFile.platformOS}${extension}`;
};

export const handleUploadUpdate = (req: Request, res: Response) => {
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

        const data = dataUploads.new?.[dataFile.buildType];

        const existingData = (
          dataFile.buildType === "android"
            ? data
            : (data as PlatformsOSUpdates)?.[
                dataFile?.platformOS as PlatformsOS
              ]
        ) as UpdateInfo;

        if (!existingData) {
          console.log("Invalid platform or OS");
          isNewVersion = false;
          return;
        }

        if (dataFile.version === existingData.version) {
          console.log("Version already exists:", dataFile.version);
          isNewVersion = false;
          return;
        }

        isNewVersion = true;
      } catch {
        console.error("JSON not valid");
      }
    });

    busboy.on("file", (_, file) => {
      if (!dataFile || !isNewVersion) {
        console.log("Version not new, discarding file...");

        file.on("end", () => {
          if (connectionClosed || !sendResponse) return;

          connectionClosed = true;
          sendResponse(
            res,
            "FORBIDDEN",
            {
              error: "Version already exists or invalid platform/OS",
              success: false,
            },
            "/upload-update",
          );
        });
        file.resume();
        return;
      }

      const finalName = getFinalFileName(dataFile);
      const saveTo = path.join(UPLOAD_DIR, finalName);

      console.log(`Saving file to: ${saveTo}`);

      const writeStream = fs.createWriteStream(saveTo);

      const uploadPromise = new Promise<void>((resolve, reject) => {
        file.pipe(writeStream);

        file.on("end", resolve);
        file.on("error", (err) => {
          console.error("Error in file stream:", err);
          writeStream.destroy();
          fs.unlink(saveTo, () => {});
          reject(err);
        });

        writeStream.on("finish", resolve);
        writeStream.on("error", (err) => {
          console.error("Error writing file:", err);
          file.unpipe(writeStream);
          fs.unlink(saveTo, () => {});
          reject(err);
        });
      });

      uploads.push(uploadPromise);
    });

    busboy.on("finish", async () => {
      if (!dataFile)
        return sendResponse?.(
          res,
          "BAD_REQUEST",
          { error: "Missing or invalid data field", success: false },
          "/upload-update",
        );

      if (!isNewVersion) return;

      try {
        await Promise.all(uploads);
        updateDataUploads(
          dataFile.buildType,
          dataFile.platformOS as PlatformsOS,
          dataFile.version,
        );
        console.log("All files written successfully");
        sendResponse?.(res, "SUCCESS", { success: true }, "/upload-update");
      } catch (err) {
        console.error("Error uploading:", err);
        if (connectionClosed) return;
        sendResponse?.(
          res,
          "INTERNAL_SERVER_ERROR",
          { error: "Error uploading files", success: false },
          "/upload-update",
        );
      }
    });

    req.pipe(busboy);
  } catch (error) {
    console.error(chalk.red("Error handling upload:"), error);
    sendResponse?.(
      res,
      "INTERNAL_SERVER_ERROR",
      { error: "Internal server error", success: false },
      "/upload-update",
    );
  }
};
