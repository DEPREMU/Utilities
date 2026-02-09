import type {
  RequestChangeImageFormat,
  ResponseChangeImageFormat,
} from "@types";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import sharp from "sharp";
import { sendResponse } from "./fetch.ts";
import type { Request, Response } from "express";
import { t, supportedFormatsImages } from "../both/index.ts";

export const readImage = (imagePath: string): Buffer => {
  if (!fs || !path) return Buffer.from([]);

  try {
    return fs.readFileSync(path.resolve(imagePath));
  } catch (error) {
    console.error("Error reading image file:", error);
    return Buffer.from([]);
  }
};

const changeFormat = async (
  inputBuffer: Buffer,
  format: RequestChangeImageFormat["format"],
): Promise<{
  buffer: Buffer;
  format: RequestChangeImageFormat["format"];
}> => {
  if (!sharp)
    return {
      buffer: inputBuffer,
      format: "jpeg",
    };

  const res = {
    buffer: inputBuffer,
    format: format,
  };

  try {
    const image = sharp(inputBuffer);

    switch (format) {
      case "jpeg":
        res.buffer = await image
          .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
          .toBuffer();
        res.format = "jpeg";
        break;
      case "png":
        res.buffer = await image.png().toBuffer();
        res.format = "png";
        break;
      case "webp":
        res.buffer = await image.webp().toBuffer();
        res.format = "webp";
        break;
      case "avif":
        res.buffer = await image.avif().toBuffer();
        res.format = "avif";
        break;
      case "gif":
        res.buffer = await image.gif().toBuffer();
        res.format = "gif";
        break;
      default:
        throw new Error("Unsupported format");
    }
  } catch (error) {
    console.error(chalk?.red("Error changing image format:"), error);
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

    const convertedRes = await changeFormat(imageBuffer, format);
    const convertedString = convertedRes.buffer.toString("base64");

    const dataUri = `data:image/${convertedRes.format};base64,${convertedString}`;

    sendResponse(
      res,
      "SUCCESS",
      { success: true, imageUri: dataUri, newFormat: convertedRes.format },
      "/images/changeImageFormat",
    );
  } catch (error) {
    console.error(chalk?.red("Error changing image format:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("images.formatChangeError", lang) },
      "/images/changeImageFormat",
    );
  }
};
