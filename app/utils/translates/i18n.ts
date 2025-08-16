import { logError } from "../functions";
import en from "./English";
import es from "./Spanish";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

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
    const { checkLanguage } = await import("../functions/storageManagement");
    const lng = await checkLanguage();

    await i18n.changeLanguage(lng);
  } catch (error) {
    logError("Error configuring language:", error);
    await i18n.changeLanguage("en");
  }
};

setTimeout(configureLanguage, 0);

export { i18n };
