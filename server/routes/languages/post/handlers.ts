import axios from "axios";
import chalk from "chalk";
import { getEnvValue } from "@/env";
import { Logger, STATUS_RESPONSE, getHandlerPost } from "@common";

const url = "https://api-free.deepl.com/v2/translate";
const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Authorization: `DeepL-Auth-Key ${getEnvValue(`DEEPL_TRANSLATOR_API`)}`,
};

export const handleTranslate = getHandlerPost(
  "/languages",
  "/translate",
  async ({ body }, sendResponse) => {
    try {
      const { text, targetLanguage } = body;
      if (!text) {
        return sendResponse(STATUS_RESPONSE.BAD_REQUEST, {
          error: "Missing 'text' parameter",
        });
      }

      const response = await axios.post(
        url,
        new URLSearchParams({
          text,
          target_lang: targetLanguage,
        }),
        { headers },
      );

      if (response.status !== 200) {
        const errorData = response.data as { message?: string } | null;
        return sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          error: errorData?.message || "Translation failed",
        });
      }

      sendResponse(STATUS_RESPONSE.SUCCESS, {
        translatedText: response.data.translations?.[0]?.text || "",
      });
    } catch (error) {
      Logger.error(chalk.red("Error during translation request:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        error: "Internal server error",
      });
    }
  },
);
