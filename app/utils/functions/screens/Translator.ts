import { logError } from "../debug";
import { fetchOptions, getRouteAPI } from "../APIManagement";
import { RequestTranslate, ResponseTranslate } from "@types";

export const translate = async (
  text: string,
  targetLang: string,
): Promise<string> => {
  if (!text || !targetLang) return `Error: ${text}`;
  try {
    const res = await fetch(
      await getRouteAPI("/translate"),
      fetchOptions<RequestTranslate>("POST", {
        text,
        targetLang,
      }),
    );
    if (!res.ok) {
      logError(`Error while translating: ${res.statusText}`);
      return `Error: ${res.statusText}`;
    }
    const data = (await res.json()) as ResponseTranslate;
    return data.translatedText || "No translation available";
  } catch (error) {
    return `Error: ${error}`;
  }
};
