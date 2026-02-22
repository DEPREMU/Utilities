import React from "react";
import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { Pressable, View } from "react-native";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import { Icon, Modal, Portal, Text } from "react-native-paper";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

interface NotesAudioChoiceModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPressRecord: () => void;
  onPressSelect: () => void;
}

const NotesAudioChoiceModal: React.FC<NotesAudioChoiceModalProps> = ({
  visible,
  onDismiss,
  onPressRecord,
  onPressSelect,
}) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesNotesScreen();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.audioChoiceModal}
      >
        {visible ? (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(140)}
          >
            <View style={styles.audioChoiceRow}>
              <Pressable
                style={styles.audioChoiceButton}
                onPress={onPressRecord}
              >
                <Icon source="microphone" size={26} color={colors.text} />
                <Text style={styles.audioChoiceText}>{t("notes.record")}</Text>
              </Pressable>

              <Pressable
                style={styles.audioChoiceButton}
                onPress={onPressSelect}
              >
                <Icon source="music-note" size={26} color={colors.text} />
                <Text style={styles.audioChoiceText}>{t("notes.select")}</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </Modal>
    </Portal>
  );
};

export default memoDeep(NotesAudioChoiceModal);
