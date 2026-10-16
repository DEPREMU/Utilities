import { enServer } from "@commonSrc/both/translations/English";
import { esServer } from "@commonSrc/both/translations/Spanish";
import { LanguagesSupported, ServerTranslations } from "@types";

export const SPANISH_CALLING_PREFIXES = [
  "34",
  "52",
  "54",
  "57",
  "56",
  "51",
  "58",
  "593",
  "502",
  "53",
  "591",
  "504",
  "595",
  "503",
  "505",
  "506",
  "507",
  "598",
  "240",
  "1787",
  "1939",
  "1809",
  "1829",
  "1849",
];

/**
 * Detects whether an incoming WhatsApp sender JID belongs to a Spanish-speaking region.
 *
 * @param jid - WhatsApp JID or phone number string
 * @returns Detected language code
 */
export const detectLanguageFromJid = (jid: string): LanguagesSupported => {
  const digits = jid.split("@")[0].replace(/\D/g, "");

  const isSpanish = SPANISH_CALLING_PREFIXES.some((prefix) =>
    digits.startsWith(prefix),
  );

  return isSpanish ? "es" : "en";
};

/**
 * Retrieves a localized WhatsApp bot notification message.
 *
 * @param key - Translation key under ServerTranslations.whatsapp
 * @param lang - Target language
 * @returns Localized text string
 */
export const getBotMessage = (
  key: keyof ServerTranslations["whatsapp"],
  lang: LanguagesSupported,
): string => {
  const dict = lang === "es" ? esServer.whatsapp : enServer.whatsapp;
  return dict[key] || enServer.whatsapp[key] || "";
};
