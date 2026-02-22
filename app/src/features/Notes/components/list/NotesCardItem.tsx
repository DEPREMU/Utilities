import Animated, {
  FadeOut,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import React from "react";
import { View } from "react-native";
import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { Card, Icon, Text } from "react-native-paper";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";

interface NotesCardItemProps {
  title: string;
  preview: string;
  dateText: string;
  previewLines: number;
  isPinned?: boolean;
  isHidden?: boolean;
  isGrid?: boolean;
  isSelected?: boolean;
  animationDelay?: number;
  onPress: () => void;
  onLongPress?: () => void;
}

const AnimatedCard = Animated.createAnimatedComponent(Card);

const NotesCardItem: React.FC<NotesCardItemProps> = ({
  title,
  preview,
  dateText,
  previewLines,
  isPinned,
  isHidden,
  isGrid,
  isSelected,
  animationDelay = 0,
  onPress,
  onLongPress,
}) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesNotesScreen();

  return (
    <AnimatedCard
      mode="elevated"
      entering={FadeInDown.duration(200).delay(animationDelay)}
      exiting={FadeOut.duration(140)}
      layout={LinearTransition.duration(140)}
      style={[
        styles.noteCard,
        isGrid ? styles.noteCardGrid : null,
        isSelected ? styles.noteCardSelected : null,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Card.Content style={styles.noteCardContent}>
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {title}
          </Text>
          {isHidden ? (
            <Icon source="eye-off" size={16} color={colors.text} />
          ) : null}
        </View>

        <Text style={styles.notePreview} numberOfLines={previewLines}>
          {preview}
        </Text>

        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>{dateText}</Text>
          {isPinned ? (
            <View style={styles.notePinBadge}>
              <Icon source="pin" size={12} color={colors.text} />
              <Text style={styles.notePinBadgeText}>{t("notes.pin")}</Text>
            </View>
          ) : null}
        </View>
      </Card.Content>
    </AnimatedCard>
  );
};

export default memoDeep(NotesCardItem);
