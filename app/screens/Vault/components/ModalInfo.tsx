import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import bytes from "bytes";
import { View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { scheduleOnRN } from "react-native-worklets";
import { fetchFileInfo } from "@utils";
import React, { useEffect } from "react";
import useStylesVaultScreen from "@styles/screens/useStylesVaultScreen";
import { FileInfo, PickedFile } from "@types";
import { getFormattedDate, memoDeep } from "@utils";
import { Divider, IconButton, Modal, Portal, Text } from "react-native-paper";

type ModalInfoProps = {
  item: PickedFile;
  onDismiss: () => void;
  useStylesVaultScreen: ReturnType<typeof useStylesVaultScreen>;
};

const unknownInfo: FileInfo = {
  uri: "",
  size: 0,
  name: "",
  mimeType: undefined,
  extension: "",
  createdAt: new Date(),
  modifiedAt: new Date(),
};

const ModalInfo: React.FC<ModalInfoProps> = ({
  item,
  onDismiss,
  useStylesVaultScreen: { styles, height },
}) => {
  const { t } = useLanguage();

  const [info, setInfo] = React.useState<FileInfo | null>(null);

  const translationY = useSharedValue(height * 2);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translationY.value }],
  }));

  useEffect(() => {
    const fetchInfo = async () => {
      const fileInfo = await fetchFileInfo(item.uri);

      translationY.value = withTiming(0, { duration: 300 });
      setInfo(!fileInfo ? unknownInfo : fileInfo);
    };

    fetchInfo();
  }, [item, translationY]);

  return (
    <Portal>
      <Animated.View style={[styles.modal, animatedStyle]}>
        <Modal
          visible
          style={styles.modal}
          onDismiss={onDismiss}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalInfoRow}>
              <IconButton
                icon="close"
                size={24}
                style={styles.modalCloseButton}
                onPress={() => {
                  translationY.value = withTiming(
                    height * 2,
                    { duration: 300 },
                    () => scheduleOnRN(onDismiss),
                  );
                }}
              />

              <Text style={styles.modalTitle}>{t("labels.fileInfo")}</Text>
            </View>

            <Divider style={styles.margin8} />

            <View style={styles.modalInfoColumn}>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>
                  {t("common.fileName", {
                    name: "",
                  })}
                </Text>
                <Text style={styles.modalInfoValue}>{item.name}</Text>
              </View>

              <Divider style={styles.margin8} />

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>
                  {t("common.fileSize", {
                    size: "",
                  })}
                </Text>
                <Text style={styles.modalInfoValue}>
                  {info ? bytes(info.size) : t("common.unknown")}
                </Text>
              </View>

              <Divider style={styles.margin8} />

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>
                  {t("common.fileType", {
                    type: "",
                  })}
                </Text>
                <Text style={styles.modalInfoValue}>
                  {info && info.mimeType ? info.mimeType : t("common.unknown")}
                </Text>
              </View>

              <Divider style={styles.margin8} />

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>
                  {t("common.createdAt", {
                    time: "",
                  })}
                </Text>
                <Text style={styles.modalInfoValue}>
                  {info
                    ? getFormattedDate(info.createdAt)
                    : t("common.unknown")}
                </Text>
              </View>

              <Divider style={styles.margin8} />

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>
                  {t("common.modifiedAt", {
                    time: "",
                  })}
                </Text>
                <Text style={styles.modalInfoValue}>
                  {info
                    ? getFormattedDate(info.modifiedAt)
                    : t("common.unknown")}
                </Text>
              </View>

              <Divider style={styles.margin8} />

              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>
                  {t("common.fileExtension", {
                    ext: "",
                  })}
                </Text>
                <Text style={styles.modalInfoValue}>
                  {info && info.extension
                    ? info.extension
                    : t("common.unknown")}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </Portal>
  );
};

export default memoDeep(ModalInfo);
