import Animated, {
  withTiming,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  WithTimingConfig,
} from "react-native-reanimated";
import { Text } from "react-native-paper";
import { Timers } from "@common";
import { memoDeep } from "@utils";
import { StylesModal } from "@context/ModalContext";
import { useStylesModalComponent } from "@/common/styles/useStylesModalComponent";
import React, { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";

interface ModalProps {
  title: string;
  body: React.ReactNode | string;
  buttons: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  hideModal: boolean;
  setHideModal: React.Dispatch<React.SetStateAction<boolean>>;
  customStyles?: Record<StylesModal, object | undefined>;
}

/**
 * ModalComponent is a reusable modal component that displays a title, body content, and buttons.
 * It uses React Native Reanimated for smooth animations and transitions.
 *
 * @param {string} title - The title of the modal.
 * @param {React.ReactNode} body - The body content of the modal.
 * @param {React.ReactNode} buttons - The buttons to be displayed in the modal.
 * @param {boolean} isOpen - A boolean indicating whether the modal is open or closed.
 * @param {function} onClose - A function to be called when the modal is closed.
 * @param {boolean} hideModal - A boolean indicating whether to hide the modal.
 * @param {function} setHideModal - A function to set the hideModal state.
 */
const ModalComponent: React.FC<ModalProps> = ({
  body,
  title,
  isOpen,
  buttons,
  onClose,
  hideModal,
  setHideModal,
  customStyles,
}) => {
  const { styles, height } = useStylesModalComponent();

  const position: SharedValue<number> = useSharedValue(0);
  const idTimeout = useRef<number | null>(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: position.value }],
  }));

  useEffect(() => {
    const options: WithTimingConfig = { duration: 500 };

    if (isOpen) {
      setHideModal(false);
      position.value = withTiming(0, options);
    } else {
      idTimeout.current = Timers.setTimeout(setHideModal, 750, true);
      position.value = withTiming(height + 200, options);
    }

    return () => {
      Timers.clearTimeout(idTimeout.current);
    };
  }, [isOpen, height, position, setHideModal]);

  return (
    <Animated.View
      style={[
        styles.overlay,
        customStyles?.overlay,
        // eslint-disable-next-line react-native/no-inline-styles
        { display: hideModal ? "none" : "flex" },
        animatedStyle,
      ]}
    >
      <Pressable
        style={[styles.overlay, customStyles?.overlay]}
        onPress={onClose}
      >
        <Pressable style={[styles.modal, customStyles?.modal]}>
          <Text style={[styles.title, customStyles?.title]}>{title}</Text>
          {body !== null && typeof body !== "string" && (
            <View style={[styles.body, customStyles?.body]}>{body}</View>
          )}
          {body !== null && typeof body === "string" && (
            <ScrollView
              style={[styles.body, customStyles?.body]}
              scrollEnabled
              showsVerticalScrollIndicator
            >
              <Text style={[styles.messageText, customStyles?.messageText]}>
                {body}
              </Text>
            </ScrollView>
          )}
          {buttons !== null && (
            <View style={[styles.buttons, customStyles?.buttons]}>
              {buttons}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const ModalComponentMemo = memoDeep(ModalComponent);

export default ModalComponentMemo;
