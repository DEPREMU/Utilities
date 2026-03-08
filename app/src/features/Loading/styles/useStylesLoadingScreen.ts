import { useMemo } from "react";
import { colors as COLORS } from "@utils";
import { StyleSheet, useColorScheme } from "react-native";

export const useStylesLoadingScreen = () => {
  const theme = useColorScheme();
  const colors = useMemo(
    () => COLORS[theme === "dark" ? "dark" : "light"],
    [theme],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
        },
        main: {
          backgroundColor: colors.accent,
          flex: 1,
          justifyContent: "center",
        },
        image: {
          width: 200,
          height: 200,
          alignSelf: "center",
        },
        containerText: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          marginTop: 20,
          gap: 5,
        },
        text: {
          color: colors.text,
          fontSize: 20,
          fontWeight: "bold",
        },
        containerProgressBar: {
          marginTop: 20,
          width: "80%",
          alignSelf: "center",
        },
      }),
    [colors],
  );

  return { styles };
};
