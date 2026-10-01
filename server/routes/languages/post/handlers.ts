import axios from "axios";
import { getEnvValue } from "@/env";
import { RequestError } from "@commonSrc/both/errors/Error";
import { STATUS_RESPONSE, getHandlerPost } from "@common";

const url = "https://api-free.deepl.com/v2/translate";
const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Authorization: `DeepL-Auth-Key ${getEnvValue(`DEEPL_TRANSLATOR_API`)}`,
};

export const handleTranslate = getHandlerPost(
  "/languages",
  "/translate",
  async ({ body }, sendResponse) => {
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
      throw new RequestError(
        STATUS_RESPONSE.INTERNAL_SERVER_ERROR,
        errorData?.message || "Translation failed",
      );
    }

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      translatedText: response.data.translations?.[0]?.text || "",
    });
  },
);
