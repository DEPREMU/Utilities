import { logger } from "../debug";
import { fetchToServer } from "../APIManagement";

export const translate = async (
  text: string,
  targetLang: string,
): Promise<string> => {
  if (!text || !targetLang) return `Error: ${text}`;
  try {
    const res = await fetchToServer("/translate", {
      targetLang,
      text,
    });

    if (!res.ok) {
      logger.error(
        `Error while translating: ${res.errorText || "Unknown error"}`,
      );
      return `Error: ${res.errorText || "Unknown error"}`;
    }

    return res.data?.translatedText || "No translation available";
  } catch (error) {
    return `Error: ${error}`;
  }
};
