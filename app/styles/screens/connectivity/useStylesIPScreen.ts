import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useMemo } from "react";

const useStylesIPScreen = () => {
  const { accent } = useTheme();
  const { isPhone, getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
        },
        containerScrollView: {
          flex: 1,
          width: "100%",
        },
        contentContainer: {
          alignItems: "center",
          justifyContent: "center",
        },
        separator: {
          height: isPhone ? 10 : 14,
          borderBottomColor: accent,
          borderBottomWidth: 1,
          width: "90%",
          marginVertical: isPhone ? 14 : 18,
        },
      }),
    [accent, getCommonStyles, isPhone],
  );

  return { styles };
};

export default useStylesIPScreen;
