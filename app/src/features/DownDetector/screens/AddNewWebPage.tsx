import Animated, {
  FadeOutUp,
  FadeInDown,
  FadeInLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import {
  Text,
  Button,
  Switch,
  TextInput,
  ActivityIndicator,
} from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { useDownDetector } from "../services/zustand";
import { useStylesAddNewWebPage } from "@screens/DownDetector/styles/useStylesAddNewWebPage";
import React, { useCallback, useMemo } from "react";

const AddNewWebPageScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesAddNewWebPage();

  const data = useDownDetector((s) => s.data);
  const isLoading = useDownDetector((s) => s.isLoading);
  const addNewItem = useDownDetector((s) => s.addItem);

  const inputText = useDownDetector((s) => s.inputNewWebPage);
  const sendNotification = useDownDetector((s) => s.sendNotification);
  const setInputNewWebPage = useDownDetector((s) => s.setInputNewWebPage);
  const setSendNotification = useDownDetector((s) => s.setSendNotification);

  const toggleSendNotification = useCallback(() => {
    setSendNotification((prev) => !prev);
  }, [setSendNotification]);

  const disabled: boolean = useMemo(() => {
    const lowered = inputText.toLowerCase().trim();
    if (!lowered) return true;
    if (!/^(http|https):\/\//.test(lowered)) return true;

    return !!data.find((item) => item.url.toLowerCase() === lowered);
  }, [data, inputText]);

  return (
    <Animated.View
      style={styles.container}
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutRight.duration(200).springify()}
      entering={FadeInLeft.duration(200).springify()}
    >
      <Animated.View
        style={styles.sectionContainer}
        layout={LinearTransition.duration(300).springify()}
      >
        <Animated.Text
          style={styles.title}
          layout={LinearTransition.duration(200).springify()}
        >
          {t("addNewWebPage")}
        </Animated.Text>

        <Animated.View style={styles.divider} />

        <Animated.View layout={LinearTransition.duration(200).springify()}>
          <TextInput
            value={inputText}
            label={t("placeholderNewWebPage")}
            onChangeText={setInputNewWebPage}
          />
        </Animated.View>

        <Animated.View style={styles.divider} />

        <Animated.View
          style={[styles.rowSwitchText, styles.sectionContainer]}
          layout={LinearTransition.duration(200).springify()}
        >
          <Animated.Text style={styles.subtitle}>
            {t("sendNotification")}
          </Animated.Text>

          <Switch
            value={sendNotification}
            onValueChange={toggleSendNotification}
          />
        </Animated.View>

        {!disabled && (
          <Animated.View
            layout={LinearTransition.duration(200).springify()}
            exiting={FadeOutUp.duration(200).springify()}
            entering={FadeInDown.duration(200).springify()}
          >
            <Button mode="contained" onPress={addNewItem}>
              <Text style={styles.subtitle}>{t("addToDatabase")}</Text>
            </Button>
          </Animated.View>
        )}

        {isLoading && (
          <Animated.View
            layout={LinearTransition.duration(200).springify()}
            exiting={FadeOutUp.duration(200).springify()}
            entering={FadeInDown.duration(200).springify()}
          >
            <ActivityIndicator animating size="small" />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

export default AddNewWebPageScreen;
