import Button from "@components/common/ButtonComponent";
import { Tables } from "@types";
import SkeletonLoading from "@components/common/SkeletonLoading";
import React, { useMemo } from "react";
import { Platform, ScrollView } from "react-native";
import useStylesClipboardScreen from "@styles/screens/clipboard/useStylesClipboardScreen";
import { Card, Text, TextInput } from "react-native-paper";
import { getFormattedDate, memoDeep } from "@utils";

interface RenderClipboardItemProps {
  item: Tables["ClipboardSync"];
  title: string;
  copyLabel: string;
  removeLabel: string;
  deleteItem: (id: string, deleted: boolean) => Promise<void>;
  copyContent: (content: string) => Promise<void>;
}

const RenderClipboardItem: React.FC<RenderClipboardItemProps> = ({
  item,
  title,
  copyLabel,
  removeLabel,
  deleteItem,
  copyContent,
}) => {
  const { styles } = useStylesClipboardScreen();

  const cardTitle = useMemo(
    () => <Card.Title style={styles.titleCard} title={title} />,
    [styles.titleCard, title],
  );

  const contentCard = useMemo(() => {
    if (Platform.OS === "web")
      return (
        <TextInput
          style={styles.contentCard}
          editable={false}
          multiline
          value={item.content}
        />
      );
    else
      return (
        <ScrollView
          nestedScrollEnabled
          style={styles.contentCard}
          showsVerticalScrollIndicator
        >
          <Text style={styles.contentCardAndroid} selectable>
            {item.content}
          </Text>
        </ScrollView>
      );
  }, [item.content, styles.contentCard, styles.contentCardAndroid]);

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
          textButton: styles.buttonText,
        }}
        label={removeLabel}
        handlePress={deleteItem}
        argsFuncHandlePress={[item.id || "", !item.deleted]}
        touchableOpacity
      />

      <Button
        replaceStyles={{
          button: styles.buttonContainer,
          textButton: styles.buttonText,
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
