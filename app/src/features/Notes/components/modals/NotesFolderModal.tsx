import React from "react";
import { memoDeep } from "@utils";
import { Pressable } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import { Modal, Portal, Text, TextInput } from "react-native-paper";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

interface NotesFolderModalProps {
  visible: boolean;
  value: string;
  onChangeText: (value: string) => void;
  onDismiss: () => void;
  onCreate: () => void;
}

const NotesFolderModal: React.FC<NotesFolderModalProps> = ({
  visible,
  value,
  onChangeText,
  onDismiss,
  onCreate,
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
            <Text style={styles.modalTitle}>
              {t("notes.createFolderTitle")}
            </Text>
            <TextInput
              mode="outlined"
              value={value}
              onChangeText={onChangeText}
              placeholder={t("notes.folderNamePlaceholder")}
            />
            <Pressable style={styles.modalPrimaryButton} onPress={onCreate}>
              <Text style={styles.modalPrimaryButtonText}>
                {t("notes.create")}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Modal>
    </Portal>
  );
};

export default memoDeep(NotesFolderModal);
