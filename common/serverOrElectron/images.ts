import type {
  RequestChangeImageFormat,
  ResponseChangeImageFormat,
} from "@types";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import sharp from "sharp";
import { File } from "./fs.ts";
import { Task } from "./Task.ts";
import { Logger } from "./logger.ts";
import type { Request, Response } from "express";
import { t, supportedFormatsImages, STATUS_RESPONSE } from "../both/index.ts";
import { sendResponse } from "./express/index.ts";

const task = new Task<ResponseChangeImageFormat, "IMAGES">({
  fileWorker: "IMAGES",
  doNotDestroy: true,
});

export const readImage = async (imagePath: string): Promise<string> => {
  if (!fs || !path) return "";
  imagePath = path.resolve(imagePath);

  try {
    const file = new File(imagePath);
    const imageStr = await file.readFile("base64");

    return imageStr;
  } catch (error) {
    Logger.error(
      "Error reading image file:",
      error instanceof Error ? error.message : String(error),
    );
    return "";
  }
};

const changeFormat = async (
  imageStr: string,
  format: RequestChangeImageFormat["format"],
): Promise<ResponseChangeImageFormat> => {
  const res = await task.getResult({
    data: { imageStr, format, lang: "en" },
    abortAfter: 2 * 60 * 1000,
    functionName: "changeImageFormat",
  });

  if (res instanceof Error) {
    Logger.error(
      chalk?.red(
        "Error running image format change task:",
        format,
        imageStr.slice(0, 30) + "...",
      ),
      res.message,
    );
    return { success: false, error: res.message };
  }
  return res;
};

const isImageBuffer = async (buffer: Buffer): Promise<boolean> => {
  if (!sharp) return false;

  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
};

export const handleChangeImageFormat = async (
  req: Request<unknown, unknown, RequestChangeImageFormat>,
  res: Response<ResponseChangeImageFormat>,
) => {
  const lang = req?.body?.lang || "en";
  try {
    const { format, imageStr } = req.body || {};

    if (!format || !supportedFormatsImages.includes(format))
      return sendResponse(res, STATUS_RESPONSE.BAD_REQUEST, {
        error: t("images.invalidImageFormat", lang),
        success: false,
      });

    if (!imageStr)
      return sendResponse(res, STATUS_RESPONSE.BAD_REQUEST, {
        error: t("images.invalidImageBuffer", lang),
        success: false,
      });

    const base64Data = imageStr.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    if (!(await isImageBuffer(imageBuffer))) {
      return sendResponse(res, STATUS_RESPONSE.BAD_REQUEST, {
        error: t("images.invalidImageBuffer", lang),
        success: false,
      });
    }

    const convertedRes = await changeFormat(base64Data, format);
    const convertedString = convertedRes.imageUri;
    if (convertedRes.success && convertedString && convertedRes.newFormat) {
      const dataUri = `data:image/${convertedRes.newFormat};base64,${convertedString}`;

      sendResponse(res, STATUS_RESPONSE.SUCCESS, {
        success: true,
        imageUri: dataUri,
        newFormat: convertedRes.newFormat,
      });
      return;
    }
  } catch (error) {
    Logger.error(chalk?.red("Error changing image format:"), error);
  }
  sendResponse(res, STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
    success: false,
    error: t("images.formatChangeError", lang),
  });
};
