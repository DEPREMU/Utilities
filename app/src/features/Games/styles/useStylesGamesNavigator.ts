import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";
import { DimensionValue, StyleSheet } from "react-native";

export const useStylesGamesNavigator = () => {
  const { colors } = useAppBehavior();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const styles = StyleSheet.create({
    contentContainer: {
      flex: 1,
      maxWidth: getResponsiveValue<DimensionValue>("95%", "95%", 800),
      width: "100%",
      paddingHorizontal: 20,
      paddingVertical: 40,
      justifyContent: "flex-start",
    },
    ...texts,
    ...getCommonStyles("container"),
  });

  return { styles, ...colors };
};
