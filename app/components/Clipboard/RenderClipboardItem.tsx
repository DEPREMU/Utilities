import React from "react";
import Button from "@components/common/ButtonComponent";
import { Tables } from "@types";
import { Card, Text } from "react-native-paper";
import SkeletonLoading from "@components/common/SkeletonLoading";
import useStylesClipboardScreen from "@/styles/screens/clipboard/useStylesClipboardScreen";

interface RenderClipboardItemProps {
  item: Tables["ClipboardSync"];
  title: string;
  copyLabel: string;
  removeLabel: string;
  deleteItem: (id: string) => Promise<void>;
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

  return (
    <Card style={styles.card}>
      <SkeletonLoading style={styles.titleCard} showChildren={!!item.id}>
        <Card.Title style={styles.titleCard} title={title} />
      </SkeletonLoading>
      <SkeletonLoading style={styles.contentCard} showChildren={!!item.id}>
        <Card.Content style={styles.contentCard}>
          <Text style={styles.contentText}>{item.content}</Text>
        </Card.Content>
      </SkeletonLoading>
      <Button
        replaceStyles={{
          button: styles.buttonContainer,
          textButton: styles.buttonText,
        }}
        label={removeLabel}
        handlePress={deleteItem}
        argsFuncHandlePress={item.id}
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
        argsFuncHandlePress={item.content}
      />
    </Card>
  );
};

const RenderClipboardItemMemo = React.memo(
  RenderClipboardItem,
  (prevProps, nextProps) => {
    return (
      prevProps.title === nextProps.title &&
      prevProps.item.content === nextProps.item.content &&
      prevProps.deleteItem === nextProps.deleteItem &&
      prevProps.copyContent === nextProps.copyContent
    );
  },
);

export default RenderClipboardItemMemo;
