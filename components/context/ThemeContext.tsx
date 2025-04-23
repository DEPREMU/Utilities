import React, { createContext, useEffect, useState } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";
import { adaptNavigationTheme, MD3Theme } from "react-native-paper";
import { LightMode } from "../../utils/globalVariables/LightMode";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import fontsNavigation from "../../utils/globalVariables/fontsNavigation";
import { DarkMode } from "../../utils/globalVariables/DarkMode";
import { debounce, loadData, saveData, THEME_KEY_STORAGE } from "../../utils";

const ThemeContext = createContext<{
  setColorScheme: React.Dispatch<
    React.SetStateAction<ColorSchemeName | "auto">
  >;
  theme: MD3Theme;
  colorScheme: ColorSchemeName | "auto";
  isDarkMode: boolean;
  themeNavigation: any;
} | null>(null);

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { LightTheme: Light, DarkTheme: Dark } = adaptNavigationTheme({
    reactNavigationDark: DarkTheme,
    reactNavigationLight: DefaultTheme,
  });
  const [colorScheme, setColorScheme] = useState<ColorSchemeName | "auto">(
    "auto"
  );
  const [theme, setTheme] = useState<MD3Theme>(LightMode);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    useColorScheme() === "dark"
  );
  const [themeNavigation, setThemeNavigation] = React.useState<any>({
    ...Light,
    fonts: fontsNavigation.fonts,
  });

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await loadData(THEME_KEY_STORAGE);
      if (savedTheme) setColorScheme(savedTheme as ColorSchemeName);
    };

    loadTheme();
  }, []);

  const changeThemeToSystem = () => {
    setIsDarkMode((prev) => {
      setTheme(prev ? DarkMode : LightMode);
      setThemeNavigation({
        ...(prev ? Dark : Light),
        fonts: fontsNavigation.fonts,
      });
      return prev;
    });
  };

  const changeTheme = async (colorScheme: ColorSchemeName | "auto") => {
    if (colorScheme === "auto") changeThemeToSystem();
    else if (colorScheme === "dark") {
      setIsDarkMode(true);
      setTheme(DarkMode);
      setThemeNavigation({
        ...Dark,
        fonts: fontsNavigation.fonts,
      });
    } else if (colorScheme === "light") {
      setIsDarkMode(false);
      setTheme(LightMode);
      setThemeNavigation({
        ...Light,
        fonts: fontsNavigation.fonts,
      });
    }

    await saveData(THEME_KEY_STORAGE, colorScheme);
  };

  useEffect(() => {
    changeTheme(colorScheme);
  }, [colorScheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorScheme,
        isDarkMode,
        themeNavigation,
        setColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
};

export { ThemeProvider, ThemeContext };
