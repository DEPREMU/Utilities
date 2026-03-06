import { View } from "react-native";
import { cloneDeep } from "lodash";
import { useLanguage } from "@context/LanguageContext";
import ButtonComponent from "@/common/components/Button/screens";
import { clipboardManager } from "@utils";
import React, { useRef, useState } from "react";
import { Switch, Text, TextInput } from "react-native-paper";
import { useStylesSettingsClipboard } from "@screens/Clipboard/styles";

const SettingsClipboard: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesSettingsClipboard();

  const [clipboardData, setClipboardData] = useState(
    clipboardManager.getClipboardData(),
  );
  const [promise, setPromise] = useState<Promise<void> | null>(null);

  const handlePressSwitchRef = useRef(() => {
    setClipboardData((prev) => {
      const newValue = cloneDeep(prev);
      newValue.enabled = !prev.enabled;

      setPromise(
        clipboardManager.setClipboardData("enabled", newValue.enabled),
      );

      return newValue;
    });
  });

  const handleChangeMaxItemsRef = useRef((text: string) => {
    const newNumber = parseInt(text, 10);

    setClipboardData((prev) => {
      const newValue = cloneDeep(prev);
      newValue.maxClipboardItems = newNumber;

      return newValue;
    });

    if (isNaN(newNumber)) return;

    clipboardManager.setClipboardData("maxClipboardItems", newNumber);
  });

  const handleChangeMaxCharsRef = useRef((text: string) => {
    const newNumber = parseInt(text, 10);

    setClipboardData((prev) => {
      const newValue = cloneDeep(prev);
      newValue.maxCharsInItem = newNumber;

      return newValue;
    });

    if (isNaN(newNumber) || newNumber < 1) return;

    clipboardManager.setClipboardData("maxCharsInItem", newNumber);
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("clipboard.settings.title")}</Text>

      <ButtonComponent
        handlePress={handlePressSwitchRef.current}
        touchableOpacity
        customStyles={{
          button: { ...styles.section, ...styles.buttonEnabled },
        }}
      >
        <Text style={styles.subtitle}>{t("clipboard.settings.enabled")}</Text>

        <Switch
          value={clipboardData.enabled}
          disabled={!!promise}
          onValueChange={handlePressSwitchRef.current}
        />
      </ButtonComponent>

      <View style={styles.section}>
        <Text style={styles.subtitle}>{t("clipboard.settings.maxItems")}</Text>

        <TextInput
          style={styles.textInput}
          value={String(clipboardData.maxClipboardItems)}
          onChangeText={handleChangeMaxItemsRef.current}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>
          {t("clipboard.settings.maxCharsInItem")}
        </Text>

        <TextInput
          style={styles.textInput}
          value={String(clipboardData.maxCharsInItem)}
          onChangeText={handleChangeMaxCharsRef.current}
          keyboardType="numbers-and-punctuation"
        />
      </View>
    </View>
  );
};

export default SettingsClipboard;
