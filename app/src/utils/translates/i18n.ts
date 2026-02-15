import {
  enApp,
  esApp,
  languagesSupported,
  wrapFunctionWithError,
} from "@common";
import i18n from "i18next";
import * as Localization from "expo-localization";
import { initReactI18next } from "react-i18next";
import { storageManagement } from "../services/storage";
import { LanguagesSupported, typeT } from "@types";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: enApp },
    es: { translation: esApp },
  },
  interpolation: {
    escapeValue: false,
  },
});

/**
 * Retrieves the user's preferred language from storage.
 *
 * This function attempts to load the language preference stored under the
 * `LANGUAGE_KEY_STORAGE` key. If a valid language is found and is included
 * in the list of supported languages, it returns the language. Otherwise,
 * it returns `null`.
 *
 * @returns {Promise<LanguagesSupported | null>} A promise that resolves to the stored language if available and supported, or `null` otherwise.
 */
export const getLanguageFromStorage =
  async (): Promise<LanguagesSupported | null> => {
    const data = storageManagement.get("LANGUAGE");
    if (!data) return null;

    const languageAvailable = languagesSupported.includes(data);
    return languageAvailable ? data : null;
  };

/**
 * Retrieves the device's current language and saves it to storage if it is supported.
 *
 * @returns {Promise<LanguagesSupported | null>} The detected and supported language code, or "en" if detection fails.
 *
 * @remarks
 * - Uses the first locale from the device's localization settings.
 * - Checks if the detected language is among the supported languages.
 * - Saves the language to storage using a predefined key.
 * - Returns "en" as a fallback if detection or saving fails.
 *
 * @throws Will log an error if there is an issue during language detection or storage.
 */
export const getLanguageFromDevice = wrapFunctionWithError(
  async () => {
    const locales = Localization.getLocales()[0];
    const language = locales.languageCode as LanguagesSupported;
    const languageAvailable = languagesSupported.includes(language || "");
    if (language && languageAvailable) {
      storageManagement.save("LANGUAGE", language);
      return language;
    }
    return "en";
  },
  true,
  async (_, errMsg) => {
    import("@utils").then(({ logger }) => {
      logger.error(
        `.utils/translates/i18n.ts/getLanguageFromDevice() => ${errMsg}`,
      );
    });
    return "en" as LanguagesSupported;
  },
);

/**
 * Checks the user's language preference and saves it if not already set.
 *
 * @returns The user's preferred language, or "en" if not found.
 *
 * @remarks
 * - This function uses `expo-localization` to get the device's locale.
 * - It checks if the language is supported and saves it to local storage.
 * - If no language is found, it defaults to "en".
 */
export const checkLanguage = async (): Promise<LanguagesSupported> => {
  let lang: LanguagesSupported | null = await getLanguageFromStorage();
  if (lang) return lang;

  lang = await getLanguageFromDevice();
  if (lang) return lang;

  storageManagement.save("LANGUAGE", "en");
  return "en";
};

const configureLanguage = async () => {
  const { logger } = await import("../functions");

  try {
    const lng = await checkLanguage();

    await i18n.changeLanguage(lng);
  } catch (error) {
    logger.error?.("Error configuring language:", error);
    await i18n.changeLanguage("en");
  }
};
configureLanguage();

export const tTyped = i18n.t as typeT;

export { i18n };
