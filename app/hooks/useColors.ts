import { useColorScheme } from "react-native";
import { colors, Colors } from "../utils/constants/colors";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

/**
 * Hook to get the current color theme based on the device's color scheme
 * @returns Object containing color values for the current theme and Paper/Navigation themes
 */
export const useColors = (theme: "light" | "dark" | "auto" = "auto") => {
  const colorScheme = useColorScheme();
  const isLight = colorScheme === "light";
  if (!theme || theme === "auto") {
    theme = isLight ? "light" : "dark";
  }

  const getColor = (colorName: Colors): string => {
    return colors[theme][colorName];
  };

  const paperTheme = {
    ...(isLight ? MD3LightTheme : MD3DarkTheme),
    colors: {
      ...(isLight ? MD3LightTheme.colors : MD3DarkTheme.colors),
      primary: colors[theme].primary,
      secondary: colors[theme].secondary,
      tertiary: colors[theme].accent,
      background: colors[theme].background,
      surface: colors[theme].background,
      surfaceVariant: colors[theme].secondary,
      onBackground: colors[theme].text,
      onSurface: colors[theme].text,
      onPrimary: isLight ? colors[theme].background : "#FFFFFF",
      onSecondary: colors[theme].text,
      onTertiary: colors[theme].background,
      outline: colors[theme].border,
      error: colors[theme].error,
      errorContainer: isLight ? "#93000A" : "#FFDAD6",
      onError: isLight ? "#690005" : "#FFFFFF",
      onErrorContainer: isLight ? "#FFDAD6" : "#410002",
      primaryContainer: isLight ? "#4F378B" : "#EADDFF",
      secondaryContainer: isLight ? "#4A4458" : "#E8DEF8",
      tertiaryContainer: isLight ? "#633B48" : "#FFD8E4",
      onPrimaryContainer: isLight ? "#EADDFF" : "#21005D",
      onSecondaryContainer: isLight ? "#E8DEF8" : "#1D192B",
      onTertiaryContainer: isLight ? "#FFD8E4" : "#31111D",
    },
  };

  // React Navigation theme
  const navigationTheme = {
    ...(isLight ? DefaultTheme : DarkTheme),
    colors: {
      ...(isLight ? DefaultTheme.colors : DarkTheme.colors),
      primary: colors[theme].primary,
      background: colors[theme].background,
      card: colors[theme].secondary,
      text: colors[theme].text,
      border: colors[theme].border,
      notification: colors[theme].accent,
    },
  };

  return {
    theme,
    isLight,
    colors: colors[theme],
    getColor,
    paperTheme,
    navigationTheme,
    // Direct color accessors for convenience
    ...colors[theme],
  };
};

export default useColors;
