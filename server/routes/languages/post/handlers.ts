import axios from "axios";
import chalk from "chalk";
import { Logger } from "@common";
import { getEnvValue } from "@/env";
import { getHandlerPost } from "@/functions/getHandlerPost";

const url = "https://api-free.deepl.com/v2/translate";
const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Authorization: `DeepL-Auth-Key ${getEnvValue(`DEEPL_TRANSLATOR_API`)}`,
};

export const handleTranslate = getHandlerPost(
  "/languages",
  "/translate",
  {
    text: "string",
    targetLanguage: "string",
  },
  async (body, sendResponse) => {
    try {
      const { text, targetLanguage } = body;

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
        return sendResponse("INTERNAL_SERVER_ERROR", {
          error: errorData?.message || "Translation failed",
        });
      }

      sendResponse("SUCCESS", {
        translatedText: response.data.translations?.[0]?.text || "",
      });
    } catch (error) {
      Logger.error(chalk.red("Error during translation request:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", { error: "Internal server error" });
    }
  },
);
