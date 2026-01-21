import React from "react";
import { useLanguage } from "@context/LanguageContext";
import { VaultScreenProps } from ".";
import { View } from "react-native";

const BackupScreen: React.FC<VaultScreenProps> = ({ useStylesVaultScreen }) => {
  const { t } = useLanguage();
  const { styles } = useStylesVaultScreen;

  return <View style={styles.container}></View>;
};

export default BackupScreen;
