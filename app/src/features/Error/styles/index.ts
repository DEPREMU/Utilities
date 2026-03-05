import React from "react";
import { StyleSheet } from "react-native";

export const useStylesErrorScreen = () => {
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        },
        errorText: {
          fontSize: 16,
          textAlign: "center",
          marginBottom: 20,
        },
      }),
    [],
  );

  return { styles };
};
