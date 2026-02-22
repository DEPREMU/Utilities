import React from "react";
import { Icon } from "react-native-paper";
import { memoDeep } from "@utils";
import { Pressable } from "react-native";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

interface NotesSelectionActionsProps {
  onHide: () => void;
  onPin: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

const NotesSelectionActions: React.FC<NotesSelectionActionsProps> = ({
  onHide,
  onPin,
  onMove,
  onDelete,
  onCancel,
}) => {
  const { styles, colors } = useStylesNotesScreen();

  return (
    <Animated.View
      style={styles.bottomActions}
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
    >
      <Pressable style={styles.actionButton} onPress={onHide}>
        <Icon source="eye-off" size={18} color={colors.text} />
      </Pressable>
      <Pressable style={styles.actionButton} onPress={onPin}>
        <Icon source="pin" size={18} color={colors.text} />
      </Pressable>
      <Pressable style={styles.actionButton} onPress={onMove}>
        <Icon source="folder-move" size={18} color={colors.text} />
      </Pressable>
      <Pressable style={styles.actionButton} onPress={onDelete}>
        <Icon source="delete" size={18} color={colors.error} />
      </Pressable>
      <Pressable style={styles.actionButton} onPress={onCancel}>
        <Icon source="close" size={18} color={colors.text} />
      </Pressable>
    </Animated.View>
  );
};

export default memoDeep(NotesSelectionActions);
