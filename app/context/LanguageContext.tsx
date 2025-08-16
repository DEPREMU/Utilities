import React, {
  useState,
  useEffect,
  ReactNode,
  useContext,
  createContext,
} from "react";
import { i18n } from "@utils";
import { useTranslation } from "react-i18next";
import { checkLanguage, saveData } from "@utils";
import { LanguagesSupported, typeLanguages } from "@types";
import en from "@/utils/translates/English";
import es from "@/utils/translates/Spanish";

interface LanguageContextProps {
  language: LanguagesSupported;
  changeLanguage: (lang: LanguagesSupported) => Promise<void>;
  t: (key: keyof typeLanguages, options?: object) => string;
  translations: typeLanguages;
}

interface LanguageProviderProps {
  children: ReactNode;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const [language, setLanguage] = useState<LanguagesSupported>("en");
  const { t: i18nextT } = useTranslation();

  const getTranslations = (): typeLanguages => {
    return language === "es" ? es : en;
  };

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await checkLanguage();
      setLanguage(storedLang);
      await i18n.changeLanguage(storedLang);
    };

    loadLanguage();
  }, []);

  const changeLanguage = async (lang: LanguagesSupported) => {
    await saveData("@languageKeyStorage", lang);
    await i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t: i18nextT as (key: keyof typeLanguages, options?: object) => string,
        translations: getTranslations(),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
