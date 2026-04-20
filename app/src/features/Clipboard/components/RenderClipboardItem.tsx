import Button from "@components/Button/screens";
import Markdown from "react-native-marked";
import TextInput from "@components/TextInput";
import { Tables } from "@types";
import { ScrollView } from "react-native";
import { Card, Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@components/SkeletonLoading";
import { useStylesClipboardScreen } from "@screens/Clipboard/styles";
import React, { useMemo, useRef, useState } from "react";
import { getFormattedDate, memoDeep, REPLACERS } from "@utils";

interface RenderClipboardItemProps {
  item: Tables["ClipboardSync"];
  title: string;
  copyLabel: string;
  removeLabel: string;
  deleteItem: (id: string, deleted: boolean) => Promise<void>;
  copyContent: (content: string) => Promise<void>;
}

const MAX_CONTENT_LENGTH = REPLACERS.isWeb ? 10000 : 5000;

const RenderClipboardItem: React.FC<RenderClipboardItemProps> = ({
  item,
  title,
  copyLabel,
  removeLabel,
  deleteItem,
  copyContent,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesClipboardScreen();

  const [isMarkdown, setIsMarkdown] = useState(false);
  const [maxTextLength, setMaxTextLength] = useState(MAX_CONTENT_LENGTH);

  const getMoreContent = useRef(() => {
    setMaxTextLength((prev) => prev + MAX_CONTENT_LENGTH);
  });

  const cardTitle = useMemo(
    () => <Card.Title style={styles.titleCard} title={title} />,
    [styles.titleCard, title],
  );

  const contentCard = useMemo(() => {
    const isLargeContent = item.content.length > maxTextLength;

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
              style={styles.contentCard}
              editable={false}
              multiline
              value={text}
            />
          )}
          {isLargeContent && (
            <Button
              handlePress={() => getMoreContent.current()}
              label={t("loadMore")}
              touchableOpacity
            />
          )}
          <Button
            handlePress={() => setIsMarkdown((p) => !p)}
            label={t(isMarkdown ? "showAsPlainText" : "showAsMarkdown")}
            touchableOpacity
          />
        </>
      );
    else
      return (
        <>
          <ScrollView
            nestedScrollEnabled
            style={styles.contentCard}
            showsVerticalScrollIndicator
          >
            {isMarkdown ? (
              <Markdown value={text} />
            ) : (
              <Text style={styles.contentCardAndroid} selectable>
                {text}
              </Text>
            )}
          </ScrollView>
          {isLargeContent && (
            <Button
              handlePress={() => getMoreContent.current()}
              label={t("loadMore")}
              touchableOpacity
            />
          )}
          <Button
            handlePress={() => setIsMarkdown((p) => !p)}
            label={t(isMarkdown ? "showAsPlainText" : "showAsMarkdown")}
            touchableOpacity
          />
        </>
      );
  }, [
    t,
    item.content,
    styles.contentCard,
    styles.contentCardAndroid,
    isMarkdown,
    maxTextLength,
  ]);

  const dateItem = useMemo(() => {
    const formattedDate = getFormattedDate(new Date(item.createdAt || ""));

    return <Text style={styles.contentCardAndroid}>{formattedDate}</Text>;
  }, [item.createdAt, styles.contentCardAndroid]);

  return (
    <Card style={styles.card}>
      <SkeletonLoading style={styles.titleCard} showChildren={!!item.id}>
        {cardTitle}
      </SkeletonLoading>
      <SkeletonLoading style={styles.contentCard} showChildren={!!item.id}>
        {contentCard}
      </SkeletonLoading>
      <SkeletonLoading style={styles.contentCard} showChildren={!!item.id}>
        {dateItem}
      </SkeletonLoading>

      <Button
        replaceStyles={{
          button: {
            ...styles.buttonContainer,
            ...(!item.deleted ? styles.buttonDelete : styles.buttonRestore),
          },
          textButton: styles.subtitle,
        }}
        label={removeLabel}
        handlePress={deleteItem}
        argsFuncHandlePress={[item.id || "", !item.deleted]}
        touchableOpacity
      />

      <Button
        replaceStyles={{
          button: styles.buttonContainer,
          textButton: styles.subtitle,
        }}
        label={copyLabel}
        touchableOpacity
        handlePress={copyContent}
        argsFuncHandlePress={[item.content]}
      />
    </Card>
  );
};

const RenderClipboardItemMemo = memoDeep(RenderClipboardItem);

export default RenderClipboardItemMemo;
