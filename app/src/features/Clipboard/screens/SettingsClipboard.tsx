import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import { View } from "react-native";
import TextInput from "@components/TextInput";
import { REPLACERS } from "@common";
import { useLanguage } from "@context/LanguageContext";
import { useClipboardStore } from "@screens/Clipboard/services";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useStylesSettingsClipboard } from "@screens/Clipboard/styles";
import React, { useCallback, useEffect, useState } from "react";
import { Divider, List, RadioButton, Switch, Text } from "react-native-paper";

const SettingsClipboard: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesSettingsClipboard();

  const settings = useClipboardStore((s) => s.settings);
  const updateSettings = useClipboardStore((s) => s.updateSettings);

  const [maxCharsInput, setMaxCharsInput] = useState(
    String(settings.maxCharsInItem),
  );
  const [maxItemsInput, setMaxItemsInput] = useState(
    String(settings.maxClipboardItems),
  );

  useEffect(() => {
    setMaxItemsInput((prev) => {
      const parsed = parseInt(prev, 10);
      const normalized = !isNaN(parsed) && parsed > 0 ? parsed : -1;
      if (!isNaN(parsed) && normalized === settings.maxClipboardItems) {
        return prev;
      }
      return String(settings.maxClipboardItems);
    });
  }, [settings.maxClipboardItems]);

  useEffect(() => {
    setMaxCharsInput((prev) => {
      const parsed = parseInt(prev, 10);
      const normalized = !isNaN(parsed) && parsed > 0 ? parsed : -1;
      if (!isNaN(parsed) && normalized === settings.maxCharsInItem) {
        return prev;
      }
      return String(settings.maxCharsInItem);
    });
  }, [settings.maxCharsInItem]);

  const handlePressSwitch = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  const handleChangeMaxItems = useCallback(
    (text: string) => {
      setMaxItemsInput(text);

      const newNumber = parseInt(text, 10);
      if (isNaN(newNumber)) return;

      updateSettings({
        maxClipboardItems: newNumber > 0 ? newNumber : -1,
      });
    },
    [updateSettings],
  );

  const handleChangeMaxChars = useCallback(
    (text: string) => {
      setMaxCharsInput(text);

      const newNumber = parseInt(text, 10);
      if (isNaN(newNumber)) return;

      updateSettings({
        maxCharsInItem: newNumber > 0 ? newNumber : -1,
      });
    },
    [updateSettings],
  );

  const handleChangeWebSyncMode = useCallback(
    (value: string) => {
      if (value !== "all" && value !== "doubleCtrlC") return;
      updateSettings({ webSyncMode: value });
    },
    [updateSettings],
  );

  return (
    <KeyboardGestureArea style={styles.flex} interpolator="ios">
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Animated.ScrollView
          style={styles.scrollViewContainer}
          layout={LinearTransition.duration(300).springify()}
          contentContainerStyle={styles.scrollViewContentContainer}
        >
          <Text style={styles.title}>{t("clipboard.settings.title")}</Text>

          <Animated.View
            style={styles.sectionContainer}
            layout={LinearTransition.duration(200).springify()}
          >
            <Text style={styles.subtitle}>
              {t("clipboard.settings.enableClipboard")}
            </Text>

            <Divider style={styles.divider} />

            <View style={styles.rowSwitchText}>
              <Text style={styles.subtitle}>
                {t("clipboard.settings.enabled")}
              </Text>

              <Switch
                value={settings.enabled}
                onValueChange={handlePressSwitch}
              />
            </View>
          </Animated.View>

          <Animated.View
            style={styles.sectionContainer}
            layout={LinearTransition.duration(300).springify()}
          >
            <Animated.Text
              style={styles.subtitle}
              layout={LinearTransition.duration(200).springify()}
            >
              {t("clipboard.settings.maxItems")}
            </Animated.Text>

            <Animated.View layout={LinearTransition.duration(200).springify()}>
              <TextInput
                mode="outlined"
                value={maxItemsInput}
                keyboardType="number-pad"
                onChangeText={handleChangeMaxItems}
              />
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={styles.sectionContainer}
            layout={LinearTransition.duration(300).springify()}
          >
            <Animated.Text
              style={styles.subtitle}
              layout={LinearTransition.duration(200).springify()}
            >
              {t("clipboard.settings.maxCharsInItem")}
            </Animated.Text>

            <Animated.View layout={LinearTransition.duration(200).springify()}>
              <TextInput
                mode="outlined"
                value={maxCharsInput}
                keyboardType="number-pad"
                onChangeText={handleChangeMaxChars}
              />
            </Animated.View>
          </Animated.View>

          {REPLACERS.isWeb && settings.enabled && (
            <Animated.View layout={LinearTransition.duration(200).springify()}>
              <Divider style={styles.divider} />

              <Text style={styles.subtitle}>
                {t("clipboard.settings.webSyncModeTitle")}
              </Text>

              <RadioButton.Group
                value={settings.webSyncMode}
                onValueChange={handleChangeWebSyncMode}
              >
                <List.Item
                  title={t("clipboard.settings.webSyncModeAll")}
                  onPress={() => handleChangeWebSyncMode("all")}
                  right={() => (
                    <RadioButton
                      value="all"
                      status={
                        settings.webSyncMode === "all" ? "checked" : "unchecked"
                      }
                      onPress={() => handleChangeWebSyncMode("all")}
                    />
                  )}
                />

                <List.Item
                  title={t("clipboard.settings.webSyncModeDoubleCtrlC")}
                  onPress={() => handleChangeWebSyncMode("doubleCtrlC")}
                  right={() => (
                    <RadioButton
                      value="doubleCtrlC"
                      status={
                        settings.webSyncMode === "doubleCtrlC"
                          ? "checked"
                          : "unchecked"
                      }
                      onPress={() => handleChangeWebSyncMode("doubleCtrlC")}
                    />
                  )}
                />
              </RadioButton.Group>
            </Animated.View>
          )}
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default SettingsClipboard;
