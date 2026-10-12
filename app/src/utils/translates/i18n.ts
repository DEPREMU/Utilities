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
import { enApp, esApp, languagesSupported } from "@common";
import { Logger } from "../TOP_LEVEL";

const logger = new Logger("TranslatesI18n");

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
  const getLanguageFromStorage =
    async (): Promise<LanguagesSupported | null> => {
      await storageManagement.waitUntilInitialized();
      const data = storageManagement.get("LANGUAGE");
      if (!data) return null;

      const languageAvailable = languagesSupported.includes(data);
      return languageAvailable ? data : null;
    };

  let lang: LanguagesSupported | null = await getLanguageFromStorage();
  if (lang) return lang;

  const getLanguageFromDevice = (): LanguagesSupported => {
    try {
      const locales = Localization.getLocales()[0];
      const language = locales.languageCode as LanguagesSupported;
      if (language && languagesSupported.includes(language || "")) {
        storageManagement.save("LANGUAGE", language);
        return language;
      }
      return "en";
    } catch (error) {
      logger.error(
        `getLanguageFromDevice() => ${error instanceof Error ? error.message : String(error)}`,
      );

      return "en";
    }
  };

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
    logger.error?.(
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
