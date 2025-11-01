import Button from "@components/common/ButtonComponent";
import { Tables } from "@types";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@components/common/SkeletonLoading";
import React, { useCallback } from "react";
import useStylesDownDetectorScreen from "@styles/screens/downDetector/useStylesDownDetectorScreen";
import { Card, Switch, Text, TextInput } from "react-native-paper";

interface RenderDownDetectorItemProps {
  item: Tables["DownDetector"];
  title: string;
  removeLabel: string;
  visitWebsiteLabel: string;
  deleteItem: (id: string) => void;
  visitWebsite: (url: string) => void;
  handleSendNotification: (id: string) => void;
}

const RenderDownDetectorItem: React.FC<RenderDownDetectorItemProps> = ({
  item,
  title,
  deleteItem,
  removeLabel,
  visitWebsite,
  visitWebsiteLabel,
  handleSendNotification,
}) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesDownDetectorScreen();

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
          value={item.url}
        />
      </SkeletonLoading>
      <Button
        replaceStyles={{
          button: styles.buttonContainerSwitch,
          textButton: {},
        }}
        argsFuncHandlePress={item.id}
        handlePress={handleSendNotification}
        touchableOpacity
      >
        <Text style={styles.buttonText}>{t("sendNotification")}</Text>
        <Switch
          value={item.sendNotification}
          onValueChange={useCallback(
            () => handleSendNotification(item.id || ""),
            [item.id, handleSendNotification],
          )}
          color={colors.accent}
        />
      </Button>
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
        label={visitWebsiteLabel}
        touchableOpacity
        handlePress={visitWebsite}
        argsFuncHandlePress={item.url}
      />
    </Card>
  );
};

const RenderDownDetectorItemMemo = React.memo(
  RenderDownDetectorItem,
  (prevProps, nextProps) => {
    return (
      prevProps.title === nextProps.title &&
      prevProps.item.id === nextProps.item.id &&
      prevProps.removeLabel === nextProps.removeLabel &&
      prevProps.visitWebsiteLabel === nextProps.visitWebsiteLabel &&
      prevProps.deleteItem === nextProps.deleteItem &&
      prevProps.visitWebsite === nextProps.visitWebsite
    );
  },
);

export default RenderDownDetectorItemMemo;
