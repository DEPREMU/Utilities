import { View } from "react-native";
import TextInput from "@components/TextInput";
import { cloneDeep } from "lodash";
import { useLanguage } from "@context/LanguageContext";
import ButtonComponent from "@components/Button/screens";
import { clipboardManager } from "@utils";
import { Divider, Switch, Text } from "react-native-paper";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useStylesSettingsClipboard } from "@screens/Clipboard/styles";
import React, { useEffect, useRef, useState } from "react";

const SettingsClipboard: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesSettingsClipboard();

  const [clipboardData, setClipboardData] = useState(
    clipboardManager.getClipboardData(),
  );
  const [maxCharsInput, setMaxCharsInput] = useState(
    String(clipboardData.maxCharsInItem),
  );
  const [maxItemsInput, setMaxItemsInput] = useState(
    String(clipboardData.maxClipboardItems),
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

    setMaxItemsInput(text);

    if (isNaN(newNumber)) return;

    setClipboardData((prev) => {
      const newValue = cloneDeep(prev);
      newValue.maxClipboardItems = newNumber > 0 ? newNumber : -1;

      return newValue;
    });

    clipboardManager.setClipboardData("maxClipboardItems", newNumber);
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
    clipboardManager.setClipboardData("maxCharsInItem", newNumber);
  });

  useEffect(() => {
    if (!(promise instanceof Promise)) return;

    const wait = async () => {
      try {
        await promise;
      } finally {
        setPromise(null);
      }
    };
    wait();
  }, [promise]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("clipboard.settings.title")}</Text>

      <Animated.View
        style={styles.sectionContainer}
        layout={LinearTransition.duration(200).springify()}
      >
        <Text style={styles.subtitle}>
          {t("clipboard.settings.enableClipboard")}
        </Text>

        <Divider style={styles.divider} />

        <ButtonComponent
          disabled={promise instanceof Promise}
          handlePress={handlePressSwitchRef.current}
          replaceStyles={{ button: styles.rowSwitchText, textButton: {} }}
        >
          <Text style={styles.subtitle}>{t("clipboard.settings.enabled")}</Text>

          <Switch
            value={clipboardData.enabled}
            disabled={promise instanceof Promise}
            onValueChange={handlePressSwitchRef.current}
          />
        </ButtonComponent>
      </Animated.View>

      <View style={styles.sectionContainer}>
        <Text style={styles.subtitle}>{t("clipboard.settings.maxItems")}</Text>

        <TextInput
          mode="outlined"
          value={maxItemsInput}
          keyboardType="number-pad"
          outlineColor={colors.border}
          onChangeText={handleChangeMaxItemsRef.current}
          selectionColor={colors.primary}
          activeOutlineColor={colors.primary}
        />
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.subtitle}>
          {t("clipboard.settings.maxCharsInItem")}
        </Text>

        <TextInput
          mode="outlined"
          value={maxCharsInput}
          keyboardType="number-pad"
          outlineColor={colors.border}
          onChangeText={handleChangeMaxCharsRef.current}
          selectionColor={colors.primary}
          activeOutlineColor={colors.primary}
        />
      </View>
    </View>
  );
};

export default SettingsClipboard;
