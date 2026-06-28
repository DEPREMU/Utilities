import { Helper } from "../helpers";
import type { LanguagesSupported } from "@types";

export const languagesNames = {
  en: "English",
  es: "Español",
} as const satisfies Record<LanguagesSupported, string>;

/**
 * An array containing all supported language codes.
 *
 * @see {@link LanguagesSupported}
 * @see {@link languagesNames}
 */
export const languagesSupported = Helper.Object.keys(languagesNames);
