import useColors from "@hooks/useColors";
import { StyleSheet } from "react-native";

const useStylesCryptosNavigator = () => {
  const { background, border, text } = useColors();

  const styles = StyleSheet.create({
    tabBar: {
      backgroundColor: background,
      borderTopWidth: 1,
      borderTopColor: border,
      color: text,
    },
  });

  return { styles };
};

export default useStylesCryptosNavigator;
