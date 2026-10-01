import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesIPScreen = () => {
  const { accent } = useAppBehavior();
  const { isPhone, getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        ...getCommonStyles("container"),
      }),
    [accent, getCommonStyles, isPhone],
  );

  return { styles };
};

export default useStylesIPScreen;
