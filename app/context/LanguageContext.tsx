import React, {
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from "react";
import { i18n, isDev } from "@utils";
import { useTranslation } from "react-i18next";
import { LanguagesSupported, typeT } from "@types";
import { checkLanguage, saveDataStorage } from "@utils";

interface LanguageContextProps {
  language: LanguagesSupported;
  changeLanguage: (lang: LanguagesSupported) => Promise<void>;
  t: typeT;
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

  const t: typeT = useCallback(
    (key, ...args) => {
      const translation = i18nextT(key, ...(args as []));

      if (isDev && translation === key)
        throw new Error(`Missing translation for key: "${key}"`);

      return translation;
    },
    [i18nextT],
  );

  const changeLanguage = useCallback(async (lang: LanguagesSupported) => {
    await Promise.all([
      saveDataStorage("LANGUAGE", lang),
      i18n.changeLanguage(lang),
    ]);
    setLanguage(lang);
  }, []);

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await checkLanguage();
      setLanguage(storedLang);
      await i18n.changeLanguage(storedLang);
    };

    loadLanguage();
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        t,
        language,
        changeLanguage,
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
