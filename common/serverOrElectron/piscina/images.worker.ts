import type {
  RequestChangeImageFormat,
  ResponseChangeImageFormat,
} from "@types";
import chalk from "chalk";
import sharp from "sharp";
import { Logger } from "../logger.ts";

export const changeImageFormat = async (
  request: RequestChangeImageFormat,
): Promise<ResponseChangeImageFormat> => {
  const format = request.format;
  const inputBuffer = request.imageStr;

  const res: ResponseChangeImageFormat = {
    success: false,
    imageUri: inputBuffer,
    newFormat: format,
  };

  if (!sharp) return res;

  try {
    const image = sharp(Buffer.from(inputBuffer, "base64"));
    let buffer: Buffer;

    switch (format) {
      case "jpeg":
        buffer = await image
          .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
          .toBuffer();
        break;
      case "png":
        buffer = await image.png().toBuffer();
        break;
      case "webp":
        buffer = await image.webp().toBuffer();
        break;
      case "avif":
        buffer = await image.avif().toBuffer();
        break;
      case "gif":
        buffer = await image.gif().toBuffer();
        break;
      default:
        throw new Error("Unsupported format");
    }
    res.success = true;
    res.newFormat = format;
    res.imageUri = buffer.toString("base64");
  } catch (error) {
    Logger.error(
      chalk?.red("Error changing image format:"),
      error instanceof Error ? error.message : String(error),
    );
  }
  return res;
};
