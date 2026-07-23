import { ServerFetch } from "@common";
import { logger } from "../debug";

export const translate = async (
  text: string,
  targetLanguage: string,
): Promise<string> => {
  if (!text || !targetLanguage) return `Error: ${text}`;

  try {
    const res = await ServerFetch.post("/languages/translate", {
      text,
      targetLanguage,
    });

    if (!res.ok || res.data.error) {
      logger.error(
        `Error while translating: ${res.data.error || "Unknown error"}`,
      );
      return `Error: ${res.data.error || "Unknown error"}`;
    }

    return res.data?.translatedText || "No translation available";
  } catch (error) {
    return `Error: ${error}`;
  }
};
