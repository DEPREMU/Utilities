/* eslint-disable indent */
import type { LanguagesSupported, typeLanguagesServer } from "../../types";
import en from "./English.ts";
import es from "./Spanish.ts";

/**
 * Translates a given key into the specified language, with optional replacements.
 *
 * @param key - The key to translate.
 * @param lang - The target language for translation.
 * @param replace - An optional object containing placeholders and their replacement values.
 * @returns The translated string, with placeholders replaced by their corresponding values.
 */
export const t = (
  key: keyof typeLanguagesServer,
  lang: LanguagesSupported,
  replace?: object,
): string => {
  if (!key || !lang) return "";
  let value: string;
  switch (lang) {
    case "en":
    default:
      value = en[key];
      break;
    case "es":
      value = es[key];
      break;
  }
  if (!value) return "";
  if (!replace || Object.keys(replace || {}).length === 0) return value;
  for (const [k, v] of Object.entries(replace || {})) {
    if (typeof v === "string") {
      value = value.replace(`{{${k}}}`, v);
    } else {
      value = value.replace(`{{${k}}}`, String(v));
    }
  }
  return value;
};
