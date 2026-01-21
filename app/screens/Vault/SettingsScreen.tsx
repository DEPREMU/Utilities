import React from "react";
import { View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { Text, Button, Divider, TextInput } from "react-native-paper";
import { VaultScreenProps } from ".";
import { DEFAULT_VAULT_DATA, useVault } from "@/context/VaultContext";

const SettingsScreen: React.FC<VaultScreenProps> = ({
  useStylesVaultScreen: { styles },
}) => {
  const { settings, setSettings, functionsRef, currentFolderId } = useVault();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("vault.settings.title")}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("vault.settings.setAuthPasswordMessage", {
            folderName:
              currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME,
          })}
        </Text>
        <Button mode="contained" onPress={functionsRef.current.selectPassword}>
          {t("vault.settings.authPassword")}
        </Button>
      </View>

      <Divider style={styles.margin8} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("vault.settings.setAutoLockTime")}
        </Text>
        <TextInput
          label={t("vault.settings.autoLockTimeInMinutes")}
          value={settings.autoLockSeconds.toString()}
          keyboardType="numeric"
          onChangeText={(text) =>
            setSettings((prev) => ({
              ...prev,
              autoLockSeconds: parseInt(text) || 0,
            }))
          }
        />
      </View>
    </View>
  );
};

export default SettingsScreen;
