import type { LanguagesSupported, typeLanguagesServer } from "../../types";
import en from "./English.ts";
import es from "./Spanish.ts";

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
    case "es":
      value = es[key];
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
