import { StyleSheet } from "react-native";

const useStylesCryptosNavigator = () => {
  const styles = StyleSheet.create({
    tabBar: {
      backgroundColor: "#2a2a40",
      borderTopWidth: 1,
      borderTopColor: "#3a3a50",
      color: "#ffffff",
    },
  });

  return { styles };
};

export default useStylesCryptosNavigator;
