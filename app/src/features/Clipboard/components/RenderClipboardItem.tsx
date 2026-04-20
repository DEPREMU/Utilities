import Animated, {
  FadeInLeft,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import Markdown from "react-native-marked";
import TextInput from "@components/TextInput";
import { Tables } from "@types";
import { ScrollView } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@components/SkeletonLoading";
import { useStylesClipboardScreen } from "@screens/Clipboard/styles";
import { Text, Button, FAB, Divider } from "react-native-paper";
import React, { useCallback, useMemo, useState } from "react";
import { getFormattedDate, memoDeep, REPLACERS } from "@utils";

interface RenderClipboardItemProps {
  item: Tables["ClipboardSync"];
  deleteItem: (id: string, deleted: boolean) => Promise<void>;
}

const MAX_CONTENT_LENGTH = REPLACERS.isWeb ? 10000 : 5000;

const RenderClipboardItem: React.FC<RenderClipboardItemProps> = ({
  item,
  deleteItem,
}) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesClipboardScreen();

  const [isMarkdown, setIsMarkdown] = useState(false);
  const [maxTextLength, setMaxTextLength] = useState(MAX_CONTENT_LENGTH);

  const getMoreContent = useCallback(() => {
    setMaxTextLength((prev) => prev + MAX_CONTENT_LENGTH);
  }, []);

  const toggleMarkdown = useCallback(() => {
    setIsMarkdown((prev) => !prev);
  }, []);

  const handleCopyContent = useCallback(
    () => Clipboard.setStringAsync(item.content),
    [item.content],
  );

  const handleDeleteItem = useCallback(() => {
    deleteItem(item.id || "", !item.deleted);
  }, [deleteItem, item.id, item.deleted]);

  const isLargeContent = useMemo(
    () => item.content.length > maxTextLength,
    [item.content, maxTextLength],
  );

  const contentCard = useMemo(() => {
    const text = isLargeContent
      ? item.content.slice(0, maxTextLength) + "..."
      : item.content;

    if (REPLACERS.isWeb)
      return (
        <>
          {isMarkdown ? (
            <Markdown value={text} />
          ) : (
            <TextInput
              multiline
              style={styles.contentCard}
              value={text}
              editable={false}
            />
          )}
        </>
      );
    else
      return (
        <>
          <ScrollView
            nestedScrollEnabled
            style={styles.contentCard}
            showsVerticalScrollIndicator={REPLACERS.isWeb}
          >
            {isMarkdown ? (
              <Markdown value={text} />
            ) : (
              <Text style={styles.contentText} selectable>
                {text}
              </Text>
            )}
          </ScrollView>
        </>
      );
  }, [
    isMarkdown,
    maxTextLength,
    isLargeContent,
    item.content,
    styles.contentCard,
    styles.contentText,
  ]);

  const formattedDate = useMemo(() => {
    const date = getFormattedDate(new Date(item.createdAt || ""));

    return date;
  }, [item.createdAt]);

  const showChildren = !!item.id; //&& !REPLACERS.isDev;

  return (
    <Animated.View
      style={styles.card}
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutLeft.duration(200)}
      entering={FadeInLeft.duration(200)}
    >
      <Animated.View
        style={styles.header}
        layout={LinearTransition.duration(200).springify()}
      >
        <Animated.View
          layout={LinearTransition.duration(200).springify()}
          style={styles.titleContainer}
        >
          <SkeletonLoading
            style={styles.titleContainer}
            showChildren={showChildren}
          >
            <Text
              style={styles.titleCard}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.id}
            </Text>
          </SkeletonLoading>
        </Animated.View>

        <Animated.View
          style={styles.buttonsContainer}
          layout={LinearTransition.duration(200).springify()}
        >
          <FAB
            icon="content-copy"
            color={colors.primary}
            onPress={handleCopyContent}
            disabled={!showChildren}
          />
          <FAB
            animated
            icon={item.deleted ? "restore" : "delete"}
            color={item.deleted ? colors.primary : colors.error}
            onPress={handleDeleteItem}
            disabled={!showChildren}
          />
        </Animated.View>
      </Animated.View>

      <SkeletonLoading style={styles.contentCard} showChildren={showChildren}>
        {contentCard}
      </SkeletonLoading>

      <Animated.View
        style={styles.gap}
        layout={LinearTransition.duration(200).springify()}
      >
        {isLargeContent && (
          <Animated.View
            exiting={FadeOutRight.duration(200)}
            entering={FadeInLeft.duration(200)}
          >
            <Button mode="contained" onPress={getMoreContent}>
              <Text style={styles.h3}>{t("loadMore")}</Text>
            </Button>
          </Animated.View>
        )}

        <Button
          mode="contained"
          onPress={toggleMarkdown}
          disabled={!showChildren}
        >
          <Text style={styles.h3}>
            {t(isMarkdown ? "showAsPlainText" : "showAsMarkdown")}
          </Text>
        </Button>
      </Animated.View>

      <Animated.View
        style={styles.gap}
        layout={LinearTransition.duration(200).springify()}
      >
        <Divider style={styles.divider} />

        <SkeletonLoading
          style={styles.titleContainer}
          showChildren={showChildren}
        >
          <Text style={styles.h3}>{formattedDate}</Text>
        </SkeletonLoading>

        <SkeletonLoading
          style={styles.titleContainer}
          showChildren={showChildren}
        >
          <Text style={styles.h3}>
            {t("clipboard.contentLength", {
              length: item.content.length.toLocaleString(),
            })}
          </Text>
        </SkeletonLoading>
      </Animated.View>
    </Animated.View>
  );
};

const RenderClipboardItemMemo = memoDeep(RenderClipboardItem);

export default RenderClipboardItemMemo;
