import { StyleSheet } from "react-native";
import { useColors } from "@hooks/useColors";

const useStylesIP = () => {
  const { background, text, primary, secondary, border, shadow } = useColors();

  const styles = StyleSheet.create({
    containerSafeAreaView: {
      flex: 1,
      backgroundColor: background,
    },
    containerScrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingVertical: 30,
    },
    container: {
      flex: 1,
      alignItems: "center",
    },
    textIP: {
      fontSize: 22,
      fontWeight: "bold",
      color: primary,
      marginBottom: 20,
    },
    containerDataIP: {
      width: "100%",
      backgroundColor: secondary,
      borderRadius: 10,
      padding: 20,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: border,
    },
    textISP: {
      fontSize: 18,
      fontWeight: "600",
      color: text,
      marginBottom: 10,
    },
    textData: {
      fontSize: 16,
      color: text,
      marginBottom: 8,
    },
    mapContainer: {
      width: "100%",
      height: 300,
      borderRadius: 10,
      overflow: "hidden",
      marginTop: 20,
      borderWidth: 1,
      borderColor: border,
    },
    map: {
      flex: 1,
    },
  });
  return { styles };
};

export default useStylesIP;
