import chalk from "chalk";
import { showError } from "../functions/logger.ts";
import { getEnvValue } from "../env.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { URLSearchParams } from "url";
import { RequestTranslate } from "@types";

export const translate = getHandlerPost(
  "/translate",
  {
    text: "string",
    targetLang: "string",
  },
  async (body, sendResponse) => {
    const { text, targetLang } = body as RequestTranslate;

    try {
      const url = "https://api-free.deepl.com/v2/translate";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          auth_key: getEnvValue("DEEPL_TRANSLATOR_API"),
          text,
          target_lang: targetLang,
        }),
      });
      if (!response.ok) {
        let errorData: { message?: string } | null = null;
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors
        }
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: errorData?.message || "Translation failed",
        });
      }

      const data = await response.json();
      sendResponse("SUCCESS", {
        success: true,
        translatedText: data.translations?.[0]?.text || "",
      });
    } catch (error) {
      showError(chalk.red("Error during translation request:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "Internal server error",
      });
    }
  },
);
