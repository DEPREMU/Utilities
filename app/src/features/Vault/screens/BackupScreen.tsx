import React from "react";
import { View } from "react-native";
import { useStylesVaultScreen } from "../styles/useStylesVaultScreen";

const BackupScreen: React.FC = () => {
  const { styles } = useStylesVaultScreen();

  return <View style={styles.container}></View>;
};

export default BackupScreen;
