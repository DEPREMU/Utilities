import React from "react";
import { memoDeep } from "@utils";
import { NotesItem } from "@types";
import NotesCardItem from "@screens/Notes/components/list/NotesCardItem";
import { useLanguage } from "@context/LanguageContext";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import { Modal, Portal, Text } from "react-native-paper";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

interface HiddenItem extends NotesItem {
  preview?: string;
  formattedUpdatedAt?: string;
}

interface NotesHiddenModalProps {
  visible: boolean;
  hiddenNotes: HiddenItem[];
  onDismiss: () => void;
  onOpenNote: (item: HiddenItem) => void;
}

const NotesHiddenModal: React.FC<NotesHiddenModalProps> = ({
  visible,
  hiddenNotes,
  onDismiss,
  onOpenNote,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesNotesScreen();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.hiddenModalFull}
      >
        {visible ? (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutDown.duration(140)}
          >
            <Animated.FlatList
              data={hiddenNotes}
              style={styles.hiddenList}
              contentContainerStyle={styles.hiddenListContent}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <NotesCardItem
                  title={item.title}
                  preview={item.content}
                  previewLines={2}
                  dateText={new Date(item.updatedAt).toLocaleString()}
                  animationDelay={Math.min(index, 8) * 30}
                  onPress={() => onOpenNote(item)}
                />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t("notes.noHiddenNotes")}</Text>
              }
            />
          </Animated.View>
        ) : null}
      </Modal>
    </Portal>
  );
};

export default memoDeep(NotesHiddenModal);
