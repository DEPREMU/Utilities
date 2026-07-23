import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import { View } from "react-native";
import TextInput from "@components/TextInput";
import { cloneDeep } from "lodash";
import { useLanguage } from "@context/LanguageContext";
import { clipboardManager } from "@utils";
import { Divider, Switch, Text } from "react-native-paper";
import React, { useRef, useState } from "react";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useStylesSettingsClipboard } from "@screens/Clipboard/styles";

const SettingsClipboard: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesSettingsClipboard();

  const [clipboardData, setClipboardData] = useState(
    clipboardManager.getClipboardData(),
  );
  const [maxCharsInput, setMaxCharsInput] = useState(
    String(clipboardData.maxCharsInItem),
  );
  const [maxItemsInput, setMaxItemsInput] = useState(
    String(clipboardData.maxClipboardItems),
  );

  const handlePressSwitchRef = useRef(() => {
    setClipboardData((prev) => {
      const newValue = cloneDeep(prev);
      newValue.enabled = !prev.enabled;

      clipboardManager.setClipboardData({ enabled: newValue.enabled });

      return newValue;
    });
  });

  const handleChangeMaxItemsRef = useRef((text: string) => {
    const newNumber = parseInt(text, 10);

    setMaxItemsInput(text);

    if (isNaN(newNumber)) return;

    setClipboardData((prev) => {
      const newValue = cloneDeep(prev);
      newValue.maxClipboardItems = newNumber > 0 ? newNumber : -1;

      return newValue;
    });

    clipboardManager.setClipboardData({ maxClipboardItems: newNumber });
  });

  const handleChangeMaxCharsRef = useRef((text: string) => {
    const newNumber = parseInt(text, 10);

    setMaxCharsInput(text);

    if (isNaN(newNumber)) return;

    setClipboardData((prev) => {
      const newValue = cloneDeep(prev);
      newValue.maxCharsInItem = newNumber > 0 ? newNumber : -1;

      return newValue;
    });
    clipboardManager.setClipboardData({ maxCharsInItem: newNumber });
  });

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
                value={clipboardData.enabled}
                onValueChange={handlePressSwitchRef.current}
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
                onChangeText={handleChangeMaxItemsRef.current}
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
                onChangeText={handleChangeMaxCharsRef.current}
              />
            </Animated.View>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default SettingsClipboard;
