import path from "path";
import chalk from "chalk";
import sharp from "sharp";
import { File } from "@commonSrc/serverOrElectron/fs";
import { Task } from "@commonSrc/serverOrElectron/Task";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { RequestChangeImageFormat, ResponseChangeImageFormat } from "@types";

export class TaskImages extends Task<ResponseChangeImageFormat, "IMAGES"> {
  static instance: TaskImages | null = null;

  constructor() {
    if (TaskImages.instance) return TaskImages.instance;

    super({
      fileWorker: "IMAGES",
      doNotDestroy: true,
    });

    TaskImages.instance = this;
  }
}

export const readImage = async (imagePath: string): Promise<string> => {
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

export const changeFormat = async (
  imageStr: string,
  format: RequestChangeImageFormat["format"],
): Promise<ResponseChangeImageFormat> => {
  const res = await new TaskImages().getResult({
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

export const isImageBuffer = async (buffer: Buffer): Promise<boolean> => {
  if (!sharp) return false;

  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
};
