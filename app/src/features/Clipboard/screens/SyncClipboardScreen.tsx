import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import Animated, {
  FadeInUp,
  FadeOutUp,
  FadeInDown,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";
import TextInput from "@components/TextInput";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { useStylesSyncClipboard } from "@screens/Clipboard/styles";
import React, { useCallback, useState } from "react";
import { logger, ServerFetch, sessionManager, storageManagement } from "@utils";
import { Text, Button, TextInput as PaperTextInput } from "react-native-paper";

const SyncClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesSyncClipboard();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToDatabase = useCallback(async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!userData?.userId)
      return modalRef.openSnackBar?.(t("auth.youAreNotLoggedIn"));

    if (!inputText.trim())
      return modalRef.openSnackBar?.(t("verifications.pleaseEnterSomeText"));
    if (!sessionToken)
      return modalRef.openSnackBar?.(t("auth.youAreNotLoggedIn"));

    setIsLoading(true);
    try {
      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await ServerFetch.post(
        "/clipboard/add",
        {
          deviceId,
          content: inputText,
        },
        sessionToken,
      );

      if ("error" in res.data) {
        logger.error("Error adding text to database:", res.data.error);
        modalRef.openSnackBar?.(
          t("common.errorOccurred", { error: res.data.error }),
        );
        return;
      }

      modalRef.openSnackBar?.(t("common.textAddedToDatabase"));
      setInputText("");
    } catch {
      modalRef.openSnackBar?.(t("common.failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [inputText, t]);

  const handleClearText = useCallback(() => {
    setInputText("");
  }, []);

  return (
    <KeyboardGestureArea style={styles.flex} interpolator="ios">
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Animated.ScrollView
          style={styles.scrollViewContainer}
          layout={LinearTransition.duration(200).springify()}
          contentContainerStyle={styles.sectionContainer}
        >
          <Animated.Text
            style={styles.title}
            layout={LinearTransition.duration(200).springify()}
          >
            {t("clipboard.addTextToClipboard")}
          </Animated.Text>

          <Animated.View
            style={styles.divider}
            layout={LinearTransition.duration(200).springify()}
          />

          <Animated.View
            style={styles.sectionContainer}
            layout={LinearTransition.duration(300).springify()}
            exiting={FadeOutDown.duration(300)}
            entering={FadeInDown.duration(300)}
          >
            <TextInput
              multiline
              mode="outlined"
              value={inputText}
              style={styles.textInput}
              textColor={colors.text}
              placeholder={t("clipboard.enterYourTextHere")}
              onChangeText={setInputText}
              outlineColor={colors.border}
              selectionColor={colors.primary}
              right={
                inputText.length > 10 && (
                  <PaperTextInput.Icon
                    animated
                    icon="delete"
                    onPress={handleClearText}
                  />
                )
              }
              activeOutlineColor={colors.primary}
            />

            {!isLoading && !!inputText.trim() && (
              <Animated.View
                exiting={FadeOutUp.duration(200)}
                entering={FadeInUp.delay(200).duration(200)}
              >
                <Button
                  mode="contained"
                  onPress={handleAddToDatabase}
                  disabled={isLoading || !inputText.trim()}
                >
                  <Text style={styles.h3}>
                    {isLoading ? t("common.adding") : t("common.addToDatabase")}
                  </Text>
                </Button>
              </Animated.View>
            )}
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default SyncClipboardScreen;
