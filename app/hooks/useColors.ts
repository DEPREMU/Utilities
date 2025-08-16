import { useColorScheme } from "react-native";
import { colors, Colors } from "../utils/constants/colors";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";

/**
 * Hook to get the current color theme based on the device's color scheme
 * @returns Object containing color values for the current theme and Paper/Navigation themes
 */
export const useColors = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? "dark" : "light";

  const getColor = (colorName: Colors): string => {
    return colors[theme][colorName];
  };

  // React Native Paper theme
  const paperTheme = {
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
      primary: colors[theme].primary,
      secondary: colors[theme].secondary,
      tertiary: colors[theme].accent,
      background: colors[theme].background,
      surface: colors[theme].background,
      surfaceVariant: colors[theme].secondary,
      onBackground: colors[theme].text,
      onSurface: colors[theme].text,
      onPrimary: isDark ? colors[theme].background : "#FFFFFF",
      onSecondary: colors[theme].text,
      onTertiary: colors[theme].background,
      outline: colors[theme].border,
      error: colors[theme].error,
      errorContainer: isDark ? "#93000A" : "#FFDAD6",
      onError: isDark ? "#690005" : "#FFFFFF",
      onErrorContainer: isDark ? "#FFDAD6" : "#410002",
      primaryContainer: isDark ? "#4F378B" : "#EADDFF",
      secondaryContainer: isDark ? "#4A4458" : "#E8DEF8",
      tertiaryContainer: isDark ? "#633B48" : "#FFD8E4",
      onPrimaryContainer: isDark ? "#EADDFF" : "#21005D",
      onSecondaryContainer: isDark ? "#E8DEF8" : "#1D192B",
      onTertiaryContainer: isDark ? "#FFD8E4" : "#31111D",
    },
  };

  // React Navigation theme
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
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
    isDark,
    colors: colors[theme],
    getColor,
    paperTheme,
    navigationTheme,
    // Direct color accessors for convenience
    primary: colors[theme].primary,
    secondary: colors[theme].secondary,
    accent: colors[theme].accent,
    background: colors[theme].background,
    text: colors[theme].text,
    border: colors[theme].border,
    error: colors[theme].error,
    warning: colors[theme].warning,
    success: colors[theme].success,
    info: colors[theme].info,
    overlay: colors[theme].overlay,
    shadow: colors[theme].shadow,
  };
};

export default useColors;
