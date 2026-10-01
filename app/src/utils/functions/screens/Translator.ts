import { ServerError } from "@commonSrc/both/errors/Error";
import { REPLACERS, ServerFetch } from "@common";

export const translate = async (
  text: string,
  targetLanguage: string,
): Promise<string> => {
  if (!text || !targetLanguage) return `Error: ${text}`;

  try {
    const res = await ServerFetch.post("/languages/translate", {
      body: { text, targetLanguage },
    });

    if ("error" in res.data) {
      const errMsg = ServerError.getMessage(res.data);

      REPLACERS.Logger.error(`Error while translating: ${errMsg}`);
      return `Error: ${errMsg}`;
    }

    return res.data?.translatedText || "No translation available";
  } catch (error) {
    return `Error: ${error}`;
  }
};
