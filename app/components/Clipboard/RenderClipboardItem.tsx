import React from "react";
import Button from "@components/common/ButtonComponent";
import { Tables } from "@types";
import SkeletonLoading from "@components/common/SkeletonLoading";
import { Card, TextInput } from "react-native-paper";
import useStylesClipboardScreen from "@styles/screens/clipboard/useStylesClipboardScreen";

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
        <TextInput
          style={styles.contentCard}
          editable={false}
          multiline
          value={item.content}
        />
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
