import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { enFrontend, esFrontend } from "@common";
import type { FrontendTranslations, LanguagesSupported, typeT } from "@types";

export let language: LanguagesSupported =
  (localStorage.getItem("language") as LanguagesSupported | undefined) || "en";

export let t = (await i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: enFrontend },
    es: { translation: esFrontend },
  },
  interpolation: { escapeValue: true },
})) as typeT<FrontendTranslations>;

const initLanguage = async () => {
  if (i18n.language?.startsWith("es")) await changeLanguage("es");
  else await changeLanguage("en");
};
initLanguage();

export const changeLanguage = async (lang: LanguagesSupported) => {
  t = (await i18n.changeLanguage(lang)) as typeT<FrontendTranslations>;
  language = lang;
  localStorage.setItem("language", lang);
};
