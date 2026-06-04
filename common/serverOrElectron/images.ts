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
import { sendResponse } from "./fetch.ts";
import type { Request, Response } from "express";
import { t, supportedFormatsImages } from "../both/index.ts";

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
  imageBufferInString: string,
  format: RequestChangeImageFormat["format"],
): Promise<ResponseChangeImageFormat> => {
  const res = await task.getResult({
    data: { imageBufferInString, format, lang: "en" },
    abortAfter: 2 * 60 * 1000,
    functionName: "changeImageFormat",
  });

  if (res instanceof Error) {
    Logger.error(
      chalk?.red(
        "Error running image format change task:",
        format,
        imageBufferInString.slice(0, 30) + "...",
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
    const { format, imageBufferInString } = req.body || {};

    if (!format || !supportedFormatsImages.includes(format))
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: t("images.invalidImageFormat", lang), success: false },
        "/images/changeImageFormat",
      );

    if (!imageBufferInString)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: t("images.invalidImageBuffer", lang), success: false },
        "/images/changeImageFormat",
      );

    const base64Data = imageBufferInString.replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const imageBuffer = Buffer.from(base64Data, "base64");

    if (!(await isImageBuffer(imageBuffer))) {
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: t("images.invalidImageBuffer", lang), success: false },
        "/images/changeImageFormat",
      );
    }

    const convertedRes = await changeFormat(base64Data, format);
    const convertedString = convertedRes.imageUri;
    if (convertedRes.success && convertedString && convertedRes.newFormat) {
      const dataUri = `data:image/${convertedRes.newFormat};base64,${convertedString}`;

      return sendResponse(
        res,
        "SUCCESS",
        { success: true, imageUri: dataUri, newFormat: convertedRes.newFormat },
        "/images/changeImageFormat",
      );
    }
  } catch (error) {
    Logger.error(chalk?.red("Error changing image format:"), error);
  }
  sendResponse(
    res,
    "INTERNAL_SERVER_ERROR",
    { success: false, error: t("images.formatChangeError", lang) },
    "/images/changeImageFormat",
  );
};
