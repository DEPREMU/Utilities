import React from "react";
import { memoDeep } from "@utils";
import { Pressable } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import { Modal, Portal, Text, TextInput } from "react-native-paper";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

interface NotesUnlockModalProps {
  visible: boolean;
  hasOwnPassword: boolean;
  password: string;
  onChangePassword: (value: string) => void;
  onDismiss: () => void;
  onSubmit: () => void;
}

const NotesUnlockModal: React.FC<NotesUnlockModalProps> = ({
  visible,
  hasOwnPassword,
  password,
  onChangePassword,
  onDismiss,
  onSubmit,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesNotesScreen();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        {visible ? (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(140)}
          >
            <Text style={styles.modalTitle}>{t("notes.unlockTitle")}</Text>
            <Text style={styles.modalSubtitle}>
              {!hasOwnPassword
                ? t("notes.createPasswordDescription")
                : t("notes.typePasswordDescription")}
            </Text>
            <TextInput
              mode="outlined"
              secureTextEntry
              value={password}
              onChangeText={onChangePassword}
              placeholder={t("notes.passwordPlaceholder")}
            />
            <Pressable style={styles.modalPrimaryButton} onPress={onSubmit}>
              <Text style={styles.modalPrimaryButtonText}>
                {t("notes.continue")}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Modal>
    </Portal>
  );
};

export default memoDeep(NotesUnlockModal);
