import {
  useVault,
  DEFAULT_VAULT_DATA,
} from "@screens/Vault/context/VaultContext";
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
  PDF,
  memoDeep,
  FileInfo,
  FolderFiles,
  fetchFileInfo,
  getFormattedDate,
} from "@utils";
import bytes from "bytes";
import { ModalData } from "../screens/VaultViewer";
import { useLanguage } from "@context/LanguageContext";
import { scheduleOnRN } from "react-native-worklets";
import useStylesVaultScreen from "@screens/Vault/styles/useStylesVaultScreen";
import { useVideoPlayer, VideoView } from "expo-video";
import { Divider, IconButton, Modal, Portal, Text } from "react-native-paper";
import { View, Image, Pressable, GestureResponderEvent } from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";

type ModalComponentProps = {
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

const VideoPlayerContent: React.FC<{
  uri: string;
  style: ReturnType<typeof useStylesVaultScreen>["styles"]["videoModal"];
}> = memoDeep(({ uri, style }) => {
  const player = useVideoPlayer(uri);

  return <VideoView player={player} style={style} />;
});

const ModalComponent: React.FC<ModalComponentProps> = ({
  onDismiss,
  renderModal,
  onLongPress,
  useStylesVaultScreen,
}) => {
  const { t } = useLanguage();
  const { styles, height, width } = useStylesVaultScreen;

  const { statesRef, functionsRef } = useVault();

  const [info, setInfo] = React.useState<FileInfo | null>(null);
  const [localModal, setLocalModal] = useState(renderModal);
  const localModalRef = React.useRef(localModal);
  localModalRef.current = localModal;

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
  const isTransitioningRef = useSharedValue(false);

  const renderNewItem = useCallback(
    (direction: 1 | -1) => {
      if (isTransitioningRef.value) return;

      const exiting = () => {
        translationX.value = withTiming(0, { duration: 200 });
        isTransitioningRef.value = false;
      };

      const currentItem = localModalRef.current.item;
      const currentFolder =
        statesRef.current.folders[
          statesRef.current.currentFolderId ||
            DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME
        ];
      if (currentFolder === "locked") return exiting();

      isTransitioningRef.value = true;

      const currentIndex = currentFolder.findIndex(
        (f) => f.originalUri === currentItem.originalUri,
      );
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= currentFolder.length) {
        return exiting();
      }

      const nextItem = currentFolder[nextIndex];
      if (nextItem.decrypting) return exiting();

      const type = functionsRef.current.getTypeModalData(nextItem.mimeType);

      translationX.value = withTiming(
        direction * -width,
        { duration: 200 },
        () => {
          translationX.value = width * direction;
          scheduleOnRN(setLocalModal, {
            show: true,
            item: nextItem,
            type,
          });
          setTimeout(() => {
            translationX.value = withTiming(0, { duration: 200 }, () => {
              isTransitioningRef.value = false;
            });
          }, 200);
        },
      );
    },
    [translationX, statesRef, functionsRef, width, isTransitioningRef],
  );

  const onDismissHandler = useCallback(() => {
    translationY.value = withTiming(height * 2, { duration: 300 }, () => {
      scheduleOnRN(onDismiss);
    });
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
              if (isTransitioningRef.value) return;
              scheduleOnRN(renderNewItem, velocityX < 0 ? 1 : -1);
            }
          } else if (cappedTranslationShared.value.y) {
            const absVelocityY = Math.abs(event.velocityY);
            const absTranslationY = Math.abs(translationY.value);

            if (absTranslationY < 50 && absVelocityY < 1000) {
              translationY.value = withTiming(0, options);
            } else {
              translationY.value = withTiming(
                height * 2 * (event.translationY > 0 ? 1 : -1),
                options,
                () => scheduleOnRN(onDismiss),
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
      isTransitioningRef,
    ],
  );

  useEffect(() => {
    switch (localModal.type) {
      case "none":
        translationY.value = withTiming(height * 2, { duration: 300 }, () =>
          scheduleOnRN(onDismiss),
        );
        break;
      case "info": {
        const fetchInfo = async () => {
          const fileInfo = await fetchFileInfo(localModal.item.uri);

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
  }, [translationY, localModal.type, height, onDismiss, localModal.item.uri]);

  useEffect(() => setLocalModal(renderModal), [renderModal]);

  if (localModal.type === "none") return null;

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
              onLongPress={(event) => onLongPress(event, localModal.item)}
            >
              <Animated.View style={[styles.modal, animatedStyle]}>
                <View style={styles.modalHeader}>
                  <IconButton
                    icon="close"
                    onPress={onDismissHandler}
                    style={styles.modalCloseButton}
                  />
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {localModal.item.name}
                  </Text>
                </View>

                {localModal.type === "image" && (
                  <Image
                    style={styles.imageModal}
                    source={{ uri: localModal.item.uri }}
                    resizeMode="contain"
                  />
                )}
                {localModal.type === "video" && (
                  <VideoPlayerContent
                    key={localModal.item.originalUri || localModal.item.uri}
                    uri={localModal.item.uri}
                    style={styles.videoModal}
                  />
                )}
                {localModal.type === "pdf" && (
                  <PDF
                    scale={1}
                    style={styles.pdf}
                    source={{ uri: localModal.item.uri }}
                    minScale={0.5}
                    maxScale={20}
                    fitPolicy={2}
                    scrollEnabled
                    enableAntialiasing
                    enableDoubleTapZoom
                  />
                )}

                {localModal.type === "info" && (
                  <View style={styles.modalContent}>
                    <View style={styles.modalInfoColumn}>
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalInfoLabel}>
                          {t("common.fileName", {
                            name: "",
                          })}
                        </Text>
                        <Text style={styles.modalInfoValue}>
                          {localModal.item.name}
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

export default ModalComponent;
