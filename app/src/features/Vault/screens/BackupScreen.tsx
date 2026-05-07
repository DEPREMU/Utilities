import React from "react";
import { View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { useStylesVaultScreen } from "../styles/useStylesVaultScreen";

const BackupScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesVaultScreen();

  return <View style={styles.container}></View>;
};

export default BackupScreen;
