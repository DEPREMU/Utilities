import type {
  LanguagesSupported,
  ServerTranslations,
  ServerTranslationsKeys,
} from "@types";
import { esServer } from "./Spanish.ts";
import { enServer } from "./English.ts";

/**
 * Translates a given key into the specified language, with optional replacements.
 *
 * @param key - The key to translate.
 * @param lang - The target language for translation.
 * @param replace - An optional object containing placeholders and their replacement values.
 * @returns The translated string, with placeholders replaced by their corresponding values.
 */
export const t = <T extends ServerTranslationsKeys>(
  key: T,
  lang: LanguagesSupported,
  replace?: object,
): string => {
  if (!key || !lang) return "";
  let value: string;
  switch (lang) {
    case "en":
    default:
      if (!key.includes("."))
        value = enServer[key as keyof ServerTranslations] as string;
      else {
        const keys = key.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let temp: any = enServer[keys.shift() as keyof typeof enServer];
        for (const k of keys) {
          temp = temp?.[k];
          if (!temp) break;
        }
        if (typeof temp === "string") value = temp;
        else {
          throw new Error(
            `Missing translation for key "${key}" in language "${lang}"`,
          );
        }
      }
      break;
    case "es":
      if (!key.includes("."))
        value = esServer[key as keyof ServerTranslations] as string;
      else {
        const keys = key.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let temp: any = esServer[keys[0] as keyof typeof esServer];
        for (const k of keys.slice(1)) {
          temp = temp?.[k];
          if (!temp) break;
        }
        if (temp && typeof temp === "string") value = temp;
        else {
          throw new Error(
            `Missing translation for key "${key}" in language "${lang}"`,
          );
        }
      }
      break;
  }
  if (!value) return "";
  if (typeof replace !== "object" || Object.keys(replace).length === 0)
    return value;
  for (const [k, v] of Object.entries(replace)) {
    value = value.replace(`{{${k}}}`, String(v || ""));
  }
  return value;
};

export * from "./English.ts";
export * from "./Spanish.ts";
export * from "./translates.ts";
