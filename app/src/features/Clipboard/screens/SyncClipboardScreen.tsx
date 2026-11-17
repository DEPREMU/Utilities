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
import { useLanguage } from "@context/LanguageContext";
import { useClipboardStore } from "@screens/Clipboard/services";
import { useStylesSyncClipboard } from "@screens/Clipboard/styles";
import React, { useCallback } from "react";
import { Text, Button, TextInput as PaperTextInput } from "react-native-paper";

const SyncClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesSyncClipboard();

  const inputText = useClipboardStore((s) => s.inputText);
  const setInputText = useClipboardStore((s) => s.setInputText);
  const isAddingItem = useClipboardStore((s) => s.isAddingItem);
  const addItemToDatabase = useClipboardStore((s) => s.addItemToDatabase);

  const handleAddToDatabase = useCallback(() => {
    void addItemToDatabase(t);
  }, [addItemToDatabase, t]);

  const handleClearText = useCallback(() => {
    setInputText("");
  }, [setInputText]);

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
              activeOutlineColor={colors.primary}
              right={
                inputText.length > 10 && (
                  <PaperTextInput.Icon
                    animated
                    icon="delete"
                    onPress={handleClearText}
                  />
                )
              }
            />

            {!isAddingItem && !!inputText.trim() && (
              <Animated.View
                exiting={FadeOutUp.duration(200)}
                entering={FadeInUp.delay(200).duration(200)}
              >
                <Button
                  mode="contained"
                  onPress={handleAddToDatabase}
                  disabled={isAddingItem || !inputText.trim()}
                >
                  <Text style={styles.h3}>
                    {isAddingItem
                      ? t("common.adding")
                      : t("common.addToDatabase")}
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
