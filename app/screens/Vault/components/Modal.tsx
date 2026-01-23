import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  fetchFileInfo,
  FileInfo,
  FolderFiles,
  getFormattedDate,
  memoDeep,
} from "@/utils";
import { View, Image, Pressable, GestureResponderEvent } from "react-native";
import { scheduleOnRN } from "react-native-worklets";
import useStylesVaultScreen from "@styles/screens/useStylesVaultScreen";
import { useVideoPlayer, VideoView } from "expo-video";
import { DataVaultViewer, ModalData } from "../VaultViewer";
import { DEFAULT_VAULT_DATA, useVault } from "@/context/VaultContext";
import { Divider, IconButton, Modal, Portal, Text } from "react-native-paper";
import React, { useCallback, useEffect, useMemo } from "react";
import Pdf from "react-native-pdf";
import { useLanguage } from "@/context/LanguageContext";
import bytes from "bytes";

type ModalComponentProps = {
  dataRef: React.RefObject<DataVaultViewer>;
  onDismiss: () => void;
  renderModal: ModalData;
  setRenderModal: React.Dispatch<React.SetStateAction<ModalData>>;
  useStylesVaultScreen: ReturnType<typeof useStylesVaultScreen>;
  onLongPress: (
    event: GestureResponderEvent,
    item: FolderFiles[number],
  ) => void;
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

const ModalComponent: React.FC<ModalComponentProps> = ({
  dataRef,
  onDismiss,
  renderModal,
  onLongPress,
  setRenderModal,
  useStylesVaultScreen,
}) => {
  const { t } = useLanguage();
  const { styles, height, width } = useStylesVaultScreen;

  const { statesRef, functionsRef } = useVault();

  const [info, setInfo] = React.useState<FileInfo | null>(null);

  const translationX = useSharedValue<number>(0);
  const translationY = useSharedValue<number>(height * 2);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translationY.value },
        { translateX: translationX.value },
      ],
    };
  });

  const cappedTranslationShared = useSharedValue({
    x: false,
    y: false,
  });

  const video = useVideoPlayer(renderModal.item.uri);

  const renderNewItem = useCallback(
    (direction: 1 | -1) => {
      const currentItem = dataRef.current.renderModal.item;
      const currentFolder =
        statesRef.current.folders[
          statesRef.current.currentFolderId ||
            DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME
        ];
      if (currentFolder === "locked")
        translationX.value = withTiming(0, { duration: 200 });
      else {
        const currentIndex = currentFolder.findIndex(
          (f) => f.uri === currentItem.uri,
        );
        const nextIndex = currentIndex + direction;
        if (nextIndex < 0 || nextIndex >= currentFolder.length) {
          translationX.value = withTiming(0, { duration: 200 });
          return;
        }

        const nextItem = currentFolder[nextIndex];

        const type = functionsRef.current.getTypeModalData(nextItem.mimeType);

        translationX.value = withTiming(
          direction * -width,
          { duration: 200 },
          () => {
            translationX.value = width * direction;
            scheduleOnRN(setRenderModal, {
              show: true,
              item: nextItem,
              type,
            });
            translationX.value = withTiming(0, { duration: 200 });
          },
        );
      }
    },
    [translationX, statesRef, functionsRef, width, setRenderModal, dataRef],
  );

  const onDismissHandler = useCallback(() => {
    translationY.value = withTiming(height * 2, { duration: 300 }, () =>
      scheduleOnRN(onDismiss),
    );
  }, [onDismiss, translationY, height]);

  const gesturePan = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          const { velocityX, velocityY } = event;

          const absX = Math.abs(velocityX);
          const absY = Math.abs(velocityY);

          if (absX > 20 && absX >= absY && !cappedTranslationShared.value.y) {
            cappedTranslationShared.value.x = true;
          } else if (
            absY > 20 &&
            absY >= absX &&
            !cappedTranslationShared.value.x
          ) {
            cappedTranslationShared.value.y = true;
          }

          if (cappedTranslationShared.value.x) {
            translationX.value = event.translationX;
          } else if (cappedTranslationShared.value.y) {
            translationY.value = event.translationY;
          }
        })
        .onEnd((event) => {
          const { translationX: x, velocityX } = event;

          const options = { duration: 200 };

          if (cappedTranslationShared.value.x) {
            const absVelocityX = Math.abs(velocityX);
            const absTranslationX = Math.abs(x);

            if (absTranslationX < 50 && absVelocityX < 1000) {
              translationX.value = withTiming(0, options);
              return;
            } else if (absTranslationX >= 50 || absVelocityX >= 1000) {
              scheduleOnRN(renderNewItem, velocityX < 0 ? 1 : -1);
            }
          } else if (cappedTranslationShared.value.y) {
            const absVelocityY = Math.abs(event.velocityY);
            const absTranslationY = Math.abs(translationY.value);

            if (absTranslationY < 50 && absVelocityY < 1000) {
              translationY.value = withTiming(0, options);
            } else {
              translationY.value = withTiming(height * 2, options, () =>
                scheduleOnRN(onDismiss),
              );
            }
          }

          cappedTranslationShared.value = { x: false, y: false };
        }),
    [
      translationX,
      renderNewItem,
      height,
      onDismiss,
      translationY,
      cappedTranslationShared,
    ],
  );

  useEffect(() => {
    switch (renderModal.type) {
      case "none":
        translationY.value = withTiming(height * 2, { duration: 300 }, () =>
          scheduleOnRN(onDismiss),
        );
        break;
      case "info": {
        const fetchInfo = async () => {
          const fileInfo = await fetchFileInfo(renderModal.item.uri);

          translationY.value = withTiming(0, { duration: 300 });
          setInfo(!fileInfo ? unknownInfo : fileInfo);
        };

        fetchInfo();
        break;
      }

      default:
        translationY.value = withTiming(0, { duration: 300 });

        break;
    }
  }, [translationY, renderModal.type, height, onDismiss, renderModal.item.uri]);

  if (renderModal.type === "none") return null;

  return (
    <Portal>
      <Modal
        visible
        style={styles.modal}
        onDismiss={onDismissHandler}
        contentContainerStyle={styles.modalContent}
      >
        <GestureHandlerRootView style={styles.modal}>
          <GestureDetector gesture={gesturePan}>
            <Pressable
              style={styles.modal}
              onLongPress={(event) => onLongPress(event, renderModal.item)}
            >
              <Animated.View style={[styles.modal, animatedStyle]}>
                <View style={styles.modalHeader}>
                  <IconButton
                    icon="close"
                    onPress={onDismissHandler}
                    style={styles.modalCloseButton}
                  />
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {renderModal.item.name}
                  </Text>
                </View>

                {renderModal.type === "image" && (
                  <Image
                    style={styles.imageModal}
                    source={{ uri: renderModal.item.uri }}
                    resizeMode="contain"
                  />
                )}
                {renderModal.type === "video" && (
                  <VideoView player={video} style={styles.videoModal} />
                )}
                {renderModal.type === "pdf" && (
                  <Pdf
                    scale={1}
                    style={styles.pdf}
                    source={{ uri: renderModal.item.uri }}
                    minScale={0.5}
                    maxScale={20}
                    fitPolicy={2}
                    scrollEnabled
                    enableAntialiasing
                    enableDoubleTapZoom
                  />
                )}

                {renderModal.type === "info" && (
                  <View style={styles.modalContent}>
                    <View style={styles.modalInfoColumn}>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>
                          {t("common.fileName", {
                            name: "",
                          })}
                        </Text>
                        <Text style={styles.modalInfoValue}>
                          {renderModal.item.name}
                        </Text>
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
                          {info && info.mimeType
                            ? info.mimeType
                            : t("common.unknown")}
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
                )}
              </Animated.View>
            </Pressable>
          </GestureDetector>
        </GestureHandlerRootView>
      </Modal>
    </Portal>
  );
};

export default memoDeep(ModalComponent);
