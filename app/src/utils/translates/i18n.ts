import {
  typeT,
  Function,
  LanguagesSupported,
  AppTranslationsKeys,
} from "@types";
import i18n from "i18next";
import * as Localization from "expo-localization";
import { initReactI18next } from "react-i18next";
import { storageManagement } from "../services/storage";
import { enApp, esApp, languagesSupported, REPLACERS } from "@common";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: enApp },
    es: { translation: esApp },
  },
  interpolation: { escapeValue: true },
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
    await storageManagement.waitUntilInitialized();
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
export const getLanguageFromDevice = (): LanguagesSupported => {
  try {
    const locales = Localization.getLocales()[0];
    const language = locales.languageCode as LanguagesSupported;
    if (language && languagesSupported.includes(language || "")) {
      storageManagement.save("LANGUAGE", language);
      return language;
    }
    return "en";
  } catch (error) {
    REPLACERS.Logger.error(
      `getLanguageFromDevice() => ${error instanceof Error ? error.message : String(error)}`,
    );

    return "en";
  }
};

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

  lang = getLanguageFromDevice();
  if (lang) return lang;

  storageManagement.save("LANGUAGE", "en");
  return "en";
};

const configureLanguage = async () => {
  try {
    const lng = await checkLanguage();

    await i18n.changeLanguage(lng);
  } catch (error) {
    await i18n.changeLanguage("en");
    REPLACERS.Logger.error?.(
      "Error configuring language:",
      error instanceof Error ? error.message : String(error),
    );
  }
};
configureLanguage();

export const tTyped = i18n.t as typeT;

/**
 * This function allows to use dynamic translations without needing to transform the key into a template string.
 * @usage
 * Instead of doing:
 * ```
 * const dynamicKey: AppTranslationsKeys = "welcome_message";
 * const translation = t(dynamicKey); // ts-error: It expected two arguments, but only one is given.
 * ```
 * You can do:
 * ```
 * const dynamicKey: AppTranslationsKeys = "welcome_message";
 * const translation = dynamicT(dynamicKey); // No ts-error, and it will return the correct translation.
 * ```
 */
export const dynamicT = i18n.t as Function<[AppTranslationsKeys], string>;

export { i18n };
