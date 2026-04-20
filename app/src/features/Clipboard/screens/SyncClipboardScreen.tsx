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
import { Text, Button } from "react-native-paper";
import { useStylesSyncClipboard } from "@screens/Clipboard/styles";
import React, { useCallback, useState } from "react";
import { fetchToServer, sessionManager, storageManagement } from "@utils";

const SyncClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesSyncClipboard();

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToDatabase = useCallback(async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!userData?.userId)
      return modalRef.openSnackBar?.(t("youAreNotLoggedIn"));

    if (!inputText.trim())
      return modalRef.openSnackBar?.(t("pleaseEnterSomeText"));
    if (!sessionToken) return modalRef.openSnackBar?.(t("youAreNotLoggedIn"));

    setIsLoading(true);
    try {
      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await fetchToServer(
        "/database/insert",
        {
          lang: storageManagement.get("LANGUAGE"),
          table: "ClipboardSync",
          deviceId,
          values: {
            userId: userData?.userId,
            content: inputText,
            deviceId,
            createdAt: new Date().toISOString(),
          },
        },
        sessionToken,
      );
      const { error } = res.data || {
        error: res.errorText || "Unknown error",
      };

      if (error) modalRef.openSnackBar?.(t("errorOccurred", { error }));
      else {
        modalRef.openSnackBar?.(t("textAddedToDatabase"));
        setInputText("");
      }
    } catch {
      modalRef.openSnackBar?.(t("failedToAddTextToDatabase"));
    } finally {
      setIsLoading(false);
    }
  }, [inputText, t]);

  return (
    <KeyboardGestureArea style={styles.flex} interpolator="ios">
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Animated.ScrollView
          style={styles.flex}
          layout={LinearTransition.duration(200).springify()}
          contentContainerStyle={styles.container}
        >
          <Animated.Text
            style={styles.title}
            layout={LinearTransition.duration(200).springify()}
          >
            {t("addTextToClipboard")}
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
              placeholder={t("enterYourTextHere")}
              onChangeText={setInputText}
              outlineColor={colors.border}
              selectionColor={colors.primary}
              activeOutlineColor={colors.primary}
            />

            {!isLoading && !!inputText.trim() && (
              <Animated.View
                entering={FadeInUp.delay(200).duration(200)}
                exiting={FadeOutUp.duration(200)}
              >
                <Button
                  contentStyle={styles.button}
                  onPress={handleAddToDatabase}
                  disabled={isLoading || !inputText.trim()}
                >
                  <Text style={styles.h3}>
                    {t(isLoading ? "adding" : "addToDatabase")}
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
