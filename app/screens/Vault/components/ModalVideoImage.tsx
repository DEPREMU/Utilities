import useStylesVaultScreen from "@styles/screens/useStylesVaultScreen";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Image, Falsy } from "react-native";
import { DownloadableMimeType } from "@types";
import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { IconButton, Modal, Portal, Text } from "react-native-paper";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { memoDeep } from "@/utils";
import { Menu, ModalData } from "../VaultViewer";
import { scheduleOnRN } from "react-native-worklets";
import { useVideoPlayer, VideoView } from "expo-video";
import { DEFAULT_VAULT_DATA, useVault } from "@/context/VaultContext";

type ModalVideoImageProps = {
  dataRef: React.RefObject<{ renderModal: ModalData; menu: Menu }>;
  onDismiss: () => void;
  renderModal: ModalData;
  setRenderModal: (data: ModalData) => void;
  useStylesVaultScreen: ReturnType<typeof useStylesVaultScreen>;
};

const getTypeModalData = (
  mimeType: DownloadableMimeType | Falsy,
): ModalData["type"] => {
  if (!mimeType) return "none";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("text/")) return "text";

  return "none";
};

const ModalVideoImage: React.FC<ModalVideoImageProps> = ({
  dataRef,
  onDismiss,
  renderModal,
  setRenderModal,
  useStylesVaultScreen: { styles, height, width },
}) => {
  const { statesRef } = useVault();

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

  const cappedTranslationRef = useRef({
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

        const type = getTypeModalData(nextItem.mimeType);

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
    [translationX, statesRef, width, setRenderModal, dataRef],
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

          if (absX > 20 && absX >= absY && !cappedTranslationRef.current.y) {
            cappedTranslationRef.current.x = true;
          } else if (
            absY > 20 &&
            absY >= absX &&
            !cappedTranslationRef.current.x
          ) {
            cappedTranslationRef.current.y = true;
          }

          if (cappedTranslationRef.current.x) {
            translationX.value = event.translationX;
          } else if (cappedTranslationRef.current.y) {
            translationY.value = event.translationY;
          }
        })
        .onEnd((event) => {
          const { translationX: x, velocityX } = event;

          const options = { duration: 200 };

          if (cappedTranslationRef.current.x) {
            const absVelocityX = Math.abs(velocityX);
            const absTranslationX = Math.abs(x);

            if (absTranslationX < 50 && absVelocityX < 1000) {
              translationX.value = withTiming(0, options);
              return;
            } else if (absTranslationX >= 50 || absVelocityX >= 1000) {
              scheduleOnRN(renderNewItem, velocityX < 0 ? 1 : -1);
            }
          } else if (cappedTranslationRef.current.y) {
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

          cappedTranslationRef.current = { x: false, y: false };
        }),
    [translationX, renderNewItem, translationY, height, onDismiss],
  );

  useEffect(() => {
    translationY.value = withTiming(0, { duration: 300 });
  }, [translationY]);

  return (
    <Portal>
      <Animated.View style={[styles.modal, animatedStyle]}>
        <Modal
          visible
          style={styles.modal}
          onDismiss={onDismissHandler}
          contentContainerStyle={styles.modalContainer}
        >
          <GestureHandlerRootView>
            <GestureDetector gesture={gesturePan}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <IconButton
                    icon="close"
                    onPress={onDismissHandler}
                    style={styles.modalCloseButton}
                  />
                  <Text style={styles.modalTitle}>{renderModal.item.name}</Text>
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
              </View>
            </GestureDetector>
          </GestureHandlerRootView>
        </Modal>
      </Animated.View>
    </Portal>
  );
};

export default memoDeep(ModalVideoImage);
