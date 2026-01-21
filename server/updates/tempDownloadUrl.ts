import {
  BuildTypeUpdates,
  RequestUploadUpdate,
  ResponseDownloadUpload,
  RequestDownloadViaTempUrl,
} from "@types";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { v4 } from "uuid";
import { showError } from "../functions/logger.ts";
import { UPLOAD_DIR } from "../config.ts";
import { getEnvValue } from "../env.ts";
import { sendResponse } from "@common";
import { getFinalFileName } from "./uploadUpdate.ts";
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
    const url = getEnvValue("API_URL").replace(
      "api",
      `updates/download/${data.buildType}/${data.version || "release"}/${data.platformOS || data.buildType}/${id}`,
    );

    tempUrls[url] = {
      id,
      version: data.version,
      maxTime: Date.now() + 5 * 60 * 1000,
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
  if (!sendResponse) return;

  try {
    const { buildType, platformOS, version, id } =
      (req.params as RequestDownloadViaTempUrl) || {};

    const fullUrl = getEnvValue("API_URL").replace(
      "api",
      `updates/download/${buildType}/${version}/${platformOS}/${id}`,
    );
    const infoUrl = tempUrls[fullUrl];

    if (!infoUrl)
      return sendResponse(
        res,
        "NOT_FOUND",
        { error: "Temporary download URL not found or expired" },
        "/download/:buildType/:version/:platformOS/:id",
      );

    if (
      infoUrl.id !== id ||
      infoUrl.buildType !== buildType ||
      infoUrl.version !== version
    )
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: "Invalid download parameters" },
        "/download/:buildType/:version/:platformOS/:id",
      );

    const filePath = path.join(
      UPLOAD_DIR,
      getFinalFileName({
        buildType,
        platformOS,
        version,
      }),
    );
    if (!fs.existsSync(filePath))
      return sendResponse(
        res,
        "NOT_FOUND",
        { error: "Requested file does not exist" },
        "/download/:buildType/:version/:platformOS/:id",
      );

    delete tempUrls[fullUrl];
    res.download(filePath, (err) => {
      if (!err || !sendResponse) return;

      showError("Error downloading file:", err);
      sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { error: "Error downloading file" },
        "/download/:buildType/:version/:platformOS/:id",
      );
    });
  } catch (error) {
    showError(chalk.red("Error processing download via temp URL:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { error: "Internal server error" },
      "/download/:buildType/:version/:platformOS/:id",
    );
  }
};

setInterval(() => {
  const now = Date.now();
  Object.entries(tempUrls).forEach(([url, info]) => {
    if (info.maxTime > now) return;

    delete tempUrls?.[url];
  });
}, 60 * 1000);
