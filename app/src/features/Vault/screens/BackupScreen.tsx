import React from "react";
import { View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { VaultScreenProps } from "./";

const BackupScreen: React.FC<VaultScreenProps> = ({ useStylesVaultScreen }) => {
  const { t } = useLanguage();
  const { styles } = useStylesVaultScreen;

  return <View style={styles.container}></View>;
};

export default BackupScreen;
