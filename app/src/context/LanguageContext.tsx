import React, {
  useRef,
  useMemo,
  useState,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n, REPLACERS } from "@utils";
import { storageManagement } from "@utils";
import { AppTranslationsKeys, LanguagesSupported, typeT } from "@types";

interface LanguageContextProps {
  language: LanguagesSupported;
  changeLanguageRef: React.RefObject<
    (lang: LanguagesSupported) => Promise<void>
  >;
  t: typeT;
  dynamicT: (key: AppTranslationsKeys) => string;
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
  const { t: i18nextT } = useTranslation();

  const [language, setLanguage] = useState<LanguagesSupported>(
    storageManagement.get("LANGUAGE"),
  );

  /**
   * This function allows to use translations with dynamic support, if key has replacers, it will automatically throw an error if the replacers are not provided, and it will also throw an error in development mode if a translation key is missing.
   * @usage
   * ```
   * t("key_with_replacer{{value}}"); // ts-error: It expected two arguments, but only one is given.
   * t("key_with_replacer{{value}}", {}); // ts-error: The property "value" is missing in the type '{}'
   * t("key_with_replacer{{value}}", { value: "someValue" }); // This is the correct way to use the translation function.
   * ```
   */
  const t: typeT = useCallback(
    (key, ...args) => {
      const translation = i18nextT(
        key,
        ...((args.length === 0 ? [{ returnObjects: true }] : args) as never),
      );

      if (REPLACERS.isDev && translation === key)
        throw new Error(`Missing translation for key: "${key}"`);

      return translation as never;
    },
    [i18nextT],
  );

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
  const dynamicT: LanguageContextProps["dynamicT"] = useCallback(
    (key) => {
      const translation = i18nextT(key);

      if (REPLACERS.isDev && translation === key)
        throw new Error(`Missing translation for key: "${key}"`);

      return translation;
    },
    [i18nextT],
  );

  const changeLanguageRef = useRef(async (lang: LanguagesSupported) => {
    setLanguage(lang);
    storageManagement.save("LANGUAGE", lang);
    await i18n.changeLanguage(lang);
  });

  const value: LanguageContextProps = useMemo(
    () => ({
      t,
      language,
      dynamicT,
      changeLanguageRef,
    }),
    [t, language, dynamicT],
  );

  return (
    <LanguageContext.Provider value={value}>
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
