import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { Switch, Text } from "react-native-paper";
import { Pressable, View } from "react-native";
import { useNotesFeature } from "@screens/Notes/context/NotesContext";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import React, { useCallback } from "react";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

const NotesSettings: React.FC = () => {
  const { styles } = useStylesNotesScreen();
  const { t } = useLanguage();
  const { settings, updateSettings } = useNotesFeature();

  const handleVaultPasswordChange = useCallback(
    (value: boolean) => {
      updateSettings({ useVaultPassword: value });
    },
    [updateSettings],
  );

  const handleSyncEnabledChange = useCallback(
    (value: boolean) => {
      updateSettings({ syncEnabled: value });
    },
    [updateSettings],
  );

  const handleToggleSyncHint = useCallback(() => {
    updateSettings({ syncEnabled: !settings.syncEnabled });
  }, [settings.syncEnabled, updateSettings]);

  return (
    <View style={styles.settingsScreenContainer}>
      <Animated.View
        style={styles.settingsCard}
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(160)}
      >
        <View style={styles.settingsRow}>
          <Text style={styles.settingsText}>{t("notes.useVaultPassword")}</Text>
          <Switch
            value={settings.useVaultPassword}
            onValueChange={handleVaultPasswordChange}
          />
        </View>

        <View style={styles.settingsRow}>
          <Text style={styles.settingsText}>{t("notes.syncEnabled")}</Text>
          <Switch
            value={settings.syncEnabled}
            onValueChange={handleSyncEnabledChange}
          />
        </View>

        <Animated.View
          entering={FadeInDown.duration(180).delay(60)}
          exiting={FadeOutDown.duration(120)}
        >
          <Pressable
            style={styles.settingsHintCard}
            onPress={handleToggleSyncHint}
          >
            <Text style={styles.settingsHintText}>{t("notes.syncHint")}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default memoDeep(NotesSettings);
