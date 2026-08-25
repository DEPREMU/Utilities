import chalk from "chalk";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { getHandlerPost } from "@commonSrc/serverOrElectron/express/functions";
import { t, supportedFormatsImages, STATUS_RESPONSE } from "@commonSrc/both";
import { changeFormat, isImageBuffer } from "../utils";

export const handleChangeImageFormat = getHandlerPost(
  "/images",
  "/change-format",
  async ({ body }, sendResponse) => {
    const lang = body.lang || "en";

    try {
      const { format, imageStr } = body;

      if (!format || !supportedFormatsImages.includes(format as never))
        return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
          error: t("images.invalidImageFormat", lang),
          success: false,
        });

      if (!imageStr)
        return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
          error: t("images.invalidImageBuffer", lang),
          success: false,
        });

      const base64Data = imageStr.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      if (!(await isImageBuffer(imageBuffer))) {
        return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
          error: t("images.invalidImageBuffer", lang),
          success: false,
        });
      }

      const convertedRes = await changeFormat(base64Data, format);
      const convertedString = convertedRes.imageUri;
      if (convertedRes.success && convertedString && convertedRes.newFormat) {
        const dataUri = `data:image/${convertedRes.newFormat};base64,${convertedString}`;

        return sendResponse(STATUS_RESPONSE.SUCCESS, {
          success: true,
          imageUri: dataUri,
          newFormat: convertedRes.newFormat,
        });
      }
    } catch (error) {
      Logger.error(chalk?.red("Error changing image format:"), error);
    }
    sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
      success: false,
      error: t("images.formatChangeError", lang),
    });
  },
);
