import en from "./English.ts";
import es from "./Spanish.ts";
import chalk from "chalk";
import type { LanguagesSupported, typeLanguagesServer } from "../../types";

/**
 * Translates a given key into the specified language, with optional replacements.
 *
 * @param key - The key to translate.
 * @param lang - The target language for translation.
 * @param replace - An optional object containing placeholders and their replacement values.
 * @returns The translated string, with placeholders replaced by their corresponding values.
 */
export const t = (
  key: keyof typeLanguagesServer | string,
  lang: LanguagesSupported,
  replace?: object,
): string => {
  if (!key || !lang) return "";
  let value: string;
  switch (lang) {
    case "en":
    default:
      if (!key.includes("."))
        value = en[key as keyof typeLanguagesServer] as string;
      else {
        const keys = key.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let temp: any = en[keys[0] as keyof typeof en];
        for (const k of keys.slice(1)) {
          temp = temp?.[k];
          if (!temp) break;
        }
        if (temp && typeof temp === "string") value = temp;
        else {
          console.log(
            chalk.yellow(
              `Missing translation for key "${key}" in language "${lang}"`,
            ),
          );
          value = key;
        }
      }
      break;
    case "es":
      if (!key.includes("."))
        value = es[key as keyof typeLanguagesServer] as string;
      else {
        const keys = key.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let temp: any = es[keys[0] as keyof typeof es];
        for (const k of keys.slice(1)) {
          temp = temp?.[k];
          if (!temp) break;
        }
        if (temp && typeof temp === "string") value = temp;
        else {
          console.log(
            chalk.yellow(
              `Missing translation for key "${key}" in language "${lang}"`,
            ),
          );
          value = key;
        }
      }
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
