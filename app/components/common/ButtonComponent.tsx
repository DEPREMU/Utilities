import {
  Text,
  Pressable,
  ViewStyle,
  TextStyle,
  TargetedEvent,
  NativeMouseEvent,
  NativeSyntheticEvent,
} from "react-native";
import { memoDeep } from "@utils";
import React, { useCallback } from "react";
import { useStylesButtonComponent } from "@styles/components/useStylesButtonComponent";

type Styles = {
  button?: ViewStyle;
  textButton?: TextStyle;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PressHandler = (...args: any[]) => void | Promise<void>;

interface ButtonComponentProps<T extends PressHandler> {
  label?: string;
  customStyles?: Styles;
  replaceStyles?: Styles;
  children?: React.ReactNode;
  touchableOpacity?: boolean;
  touchableOpacityIntensity?: number;
  forceReplaceStyles?: boolean;
  handlerHoverIn?: (event: NativeSyntheticEvent<NativeMouseEvent>) => void;
  handlerFocus?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  handlerHoverOut?: (event: NativeSyntheticEvent<NativeMouseEvent>) => void;

  handlePress: T;
  argsFuncHandlePress?: Parameters<T>;

  disabled?: boolean;
}

/**
 * ButtonComponent is a customizable button component that supports various styles and behaviors.
 *
 * @param {object} props - The properties for the ButtonComponent.
 * @param {React.ComponentType | undefined} props.Children - Optional custom child component to render inside the button. Must be a function that returns a React element.
 * @param {React.ReactNode | undefined} props.children - Optional custom child component to render inside the button. Can be any valid React node.
 * @param {() => void | undefined} props.handlerFocus - Optional callback fired when the button receives focus.
 * @param {object | undefined} props.replaceStyles - Optional styles to replace the default button and text styles, if one of the styles is empty, the style won't be replaced.
 * @param {boolean | undefined} props.touchableOpacity - If true, enables opacity feedback on press.
 * @param {boolean} [props.forceReplaceStyles=false] - If true, forces the use of replaceStyles even if not provided or the new styles are empty.
 * @param {number} [props.touchableOpacityIntensity=0.7] - The opacity value to apply when the button is pressed.
 * @param {boolean} [props.disabled=false] - If true, disables the button.
 * @param {() => void | undefined} props.handlerHoverOut - Optional callback fired when the pointer leaves the button.
 * @param {() => void | undefined} props.handlerHoverIn - Optional callback fired when the pointer enters the button.
 * @param {object | undefined} props.customStyles - Optional additional styles to apply to the button and text.
 * @param {() => void | undefined} props.handlePress - Optional callback fired when the button is pressed.
 * @param {string | undefined} props.label - Optional text label to display inside the button.
 *
 * @returns {JSX.Element} The rendered button component.
 */
const ButtonComponent = <T extends PressHandler>({
  children,
  handlerFocus,
  replaceStyles,
  touchableOpacity,
  forceReplaceStyles = false,
  touchableOpacityIntensity = 0.7,
  argsFuncHandlePress,
  disabled = false,
  handlerHoverOut,
  handlerHoverIn,
  customStyles,
  handlePress,
  label,
}: ButtonComponentProps<T>) => {
  const styles = useStylesButtonComponent();
  const handlePressCallback = useCallback(() => {
    handlePress(...(argsFuncHandlePress || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePress, ...(argsFuncHandlePress || [])]);

  return (
    <Pressable
      style={({ pressed }) => {
        const opacity = {
          opacity:
            !disabled && touchableOpacity && pressed
              ? touchableOpacityIntensity
              : 1,
        };

        if (replaceStyles?.button || forceReplaceStyles)
          return [replaceStyles?.button, opacity];
        return [styles.button, customStyles?.button, opacity];
      }}
      onFocus={handlerFocus}
      onPress={handlePressCallback}
      disabled={disabled}
      onHoverIn={handlerHoverIn}
      onHoverOut={handlerHoverOut}
    >
      {!!label && (
        <Text
          style={
            replaceStyles?.textButton || forceReplaceStyles
              ? replaceStyles?.textButton
              : [styles.textButton, customStyles?.textButton]
          }
        >
          {label}
        </Text>
      )}
      {!!children && children}
    </Pressable>
  );
};

const Button = memoDeep(ButtonComponent);

export default Button;
