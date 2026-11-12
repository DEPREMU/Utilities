import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import { LanguagesSupported, Theme } from "@types";
import { changeLanguage, language as lang } from "@/utils";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: LanguagesSupported;
  toggleLanguage: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<LanguagesSupported>(lang);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      return newTheme;
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const newLang = prev === "en" ? "es" : "en";
      changeLanguage(newLang);
      return newLang;
    });
  }, []);

  useEffect(() => {
    const storedTheme: Theme =
      (localStorage.getItem("theme") as Theme) === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", storedTheme);
    setTheme(storedTheme);

    const initialLang = lang.startsWith("es") ? "es" : "en";
    setLanguage(initialLang);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, language, toggleLanguage }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
