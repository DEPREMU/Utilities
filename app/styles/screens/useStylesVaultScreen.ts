import { useTheme } from "@context/ThemeContext";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

const useStylesVaultScreen = () => {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        content: { padding: 16, gap: 12 },
        subtitle: { opacity: 0.8 },
        loading: { paddingVertical: 24, alignItems: "center" },
        section: { gap: 8 },
        row: { flexDirection: "row", gap: 8, alignItems: "center" },
        spacer: { flex: 1 },
        progressBox: { gap: 8 },
        progressRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        muted: { opacity: 0.7 },
        itemActions: { flexDirection: "row", alignItems: "center" },
      }),
    [colors.background],
  );

  return { styles };
};

export default useStylesVaultScreen;
