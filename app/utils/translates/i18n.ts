import en from "./English";
import es from "./Spanish";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { logError, checkLanguage } from "../functions";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  interpolation: {
    escapeValue: false,
  },
});

const configureLanguage = async () => {
  try {
    const lng = await checkLanguage();

    await i18n.changeLanguage(lng);
  } catch (error) {
    logError("Error configuring language:", error);
    await i18n.changeLanguage("en");
  }
};
configureLanguage();

export { i18n };
