import fs from "fs";
import path from "path";
import Busboy from "busboy";
import { UPLOAD_DIR } from "config";
import { Request, Response } from "express";
import { RequestUploadUpdate } from "@types";
import dataUploads, { updateDataUploads } from "./dataUploads";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const getFinalFileName = (
  dataFile: Omit<RequestUploadUpdate, "timestamp">,
) => {
  let extension = "";
  if (dataFile.buildType === "web") extension = ".html";
  else if (dataFile.platformOS === "windows") extension = ".exe";
  else extension = ".deb";

  const finalName = `${dataFile.version}-${dataFile.buildType}-${dataFile.platformOS}${extension}`;

  return finalName;
};

export const handleUploadUpdate = (req: Request, res: Response) => {
  const busboy = Busboy({ headers: req.headers });
  const uploads: Promise<void>[] = [];
  let dataFile: RequestUploadUpdate | null = null;
  let isNewVersion = false;
  let connectionClosed = false;

  busboy.on("field", (fieldName, val) => {
    if (fieldName !== "data") return;

    try {
      dataFile = JSON.parse(val) as RequestUploadUpdate;

      const existingData =
        dataFile.buildType === "android"
          ? dataUploads.new?.[dataFile.buildType]
          : dataUploads.new?.[dataFile.buildType]?.[dataFile.platformOS];

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
        if (!connectionClosed) {
          connectionClosed = true;
          res.json({
            error: "Version already exists or invalid platform/OS",
          });
        }
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
    if (!dataFile) {
      res.json({ error: "Missing or invalid data field" });
      return;
    }

    if (!isNewVersion) return;

    try {
      await Promise.all(uploads);
      updateDataUploads(
        dataFile.buildType,
        dataFile.platformOS,
        dataFile.version,
      );
      console.log("All files written successfully");
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error uploading:", err);
      if (!connectionClosed) {
        res.status(500).json({ error: "Error uploading files" });
      }
    }
  });

  req.pipe(busboy);
};
