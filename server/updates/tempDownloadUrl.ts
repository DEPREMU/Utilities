import {
  BuildTypeUpdates,
  RequestUploadUpdate,
  ResponseDownloadUpload,
  RequestDownloadViaTempUrl,
} from "@types";
import fs from "fs";
import env from "env";
import path from "path";
import chalk from "chalk";
import { v4 } from "uuid";
import { UPLOAD_DIR } from "config";
import { getFinalFileName } from "./uploadUpdate";
import { Request, Response } from "express";

type InfoUrl = {
  id: string;
  version: string;
  maxTime: number;
  buildType: BuildTypeUpdates;
};
type TempUrls = { [url: string]: InfoUrl };

const tempUrls: TempUrls = {};

export const createTempDownloadUrl = (data: RequestUploadUpdate) => {
  try {
    const id = v4();
    const url =
      env.API_URL.replace("api", "updates") +
      `/download/${data.buildType}/${data.version}/${data.platformOS}/${id}`;

    tempUrls[url] = {
      id,
      version: data.version,
      maxTime: Date.now() + 10 * 60 * 1000,
      buildType: data.buildType,
    };

    return url;
  } catch {
    return "";
  }
};

export const handleDownload = (
  req: Request,
  res: Response<ResponseDownloadUpload>,
) => {
  try {
    const { buildType, platformOS, version, id } =
      req.params as RequestDownloadViaTempUrl;

    const fullUrl =
      env.API_URL.replace("api", "updates") +
      `/download/${buildType}/${version}/${platformOS}/${id}`;
    const infoUrl = tempUrls[fullUrl];

    if (!infoUrl) {
      res
        .status(404)
        .json({ error: "Temporary download URL not found or expired" });
      return;
    }

    if (
      infoUrl.id !== id ||
      infoUrl.buildType !== buildType ||
      infoUrl.version !== version
    ) {
      res.status(400).json({ error: "Invalid download parameters" });
      return;
    }

    const filePath = path.join(
      UPLOAD_DIR,
      getFinalFileName({
        buildType,
        platformOS,
        version,
      }),
    );
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Requested file does not exist" });
      return;
    }

    delete tempUrls[fullUrl];
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).json({ error: "Error downloading file" });
      }
    });
  } catch (error) {
    console.error(chalk.red("Error processing download via temp URL:"), error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

setInterval(() => {
  const now = Date.now();
  Object.entries(tempUrls).forEach(([url, info]) => {
    if (info.maxTime > now) return;

    delete tempUrls[url];
  });
}, 60 * 1000);
