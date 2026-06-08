import axios from "axios";
import chalk from "chalk";
import { Logger } from "@common";
import { getEnvValue } from "@/env.ts";
import { getHandlerPost } from "@/functions/getHandlerPost.ts";
import { URLSearchParams } from "url";

const url = "https://api-free.deepl.com/v2/translate";
const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Authorization: `DeepL-Auth-Key ${getEnvValue(`DEEPL_TRANSLATOR_API`)}`,
};

export const translate = getHandlerPost(
  "/translate",
  {
    text: "string",
    targetLang: "string",
  },
  async (body, sendResponse) => {
    const { text, targetLang } = body;

    try {
      const response = await axios.post(
        url,
        new URLSearchParams({
          text,
          target_lang: targetLang,
        }),
        { headers },
      );

      if (response.status !== 200) {
        const errorData = response.data as { message?: string } | null;
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: errorData?.message || "Translation failed",
        });
      }

      sendResponse("SUCCESS", {
        success: true,
        translatedText: response.data.translations?.[0]?.text || "",
      });
    } catch (error) {
      Logger.error(chalk.red("Error during translation request:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "Internal server error",
      });
    }
  },
);
