import {
  withTiming,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  AnimatedStyle,
} from "react-native-reanimated";
import { Timers } from "@common";
import { ViewStyle } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { ValidClearTimeout } from "@types";
import React, { useCallback, useEffect } from "react";

type UseTextInputReturn = {
  clear: () => void;
  styles: [AnimatedStyle<ViewStyle>, ViewStyle] | null;
  isValid: boolean;
  valueStr: string;
  valueNum: number;
  onChangeText: (text: string) => void;
};

type UseTextInputProps = {
  initialValue?: string;

  onChangeNum: {
    /**
     * This function will be called with the numeric value of the text input after the user stops typing for a certain amount of time (defined by timeoutChange). If the text cannot be converted to a number, it will be called with 0.
     */
    func: (value: number) => void;
    /**
     * The amount of time in milliseconds to wait after the user stops typing before calling the func with the numeric value. If not provided, it defaults to 500ms.
     */
    timeoutChange?: number;
    /**
     * A function to validate the numeric value of the text input.
     * if the function returns false, the text input will be considered invalid, and an animation will be triggered to indicate the error, the func will not be called. If not provided, all numeric values will be considered valid.
     */
    isValid?: (value: number) => boolean;
    /**
     * A function that returns a boolean to determine whether to clear the timeout when the component unmounts or when the value changes. This can be useful to prevent calling the func with an outdated value if the component is no longer in view or if the user has started typing again. If not provided, the timeout will always be cleared on unmount and value change.
     */
    cleanTimeout?: () => boolean;
  };
};

export const useTextInput = ({
  onChangeNum,
  initialValue = "",
}: UseTextInputProps): UseTextInputReturn => {
  const { colors } = useAppBehavior();

  const [valueStr, setValueStr] = React.useState<string>(initialValue);
  const [valueNum, setValueNum] = React.useState<number>(
    Number(initialValue) || 0,
  );
  const [isValid, setIsValid] = React.useState<boolean>(true);

  const xValue = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xValue.value }],
  }));

  const onChangeRef = React.useRef(onChangeNum);
  useEffect(() => {
    onChangeRef.current = onChangeNum;
  }, [onChangeNum]);

  const timeoutId = React.useRef<ValidClearTimeout>(null);

  const clear = useCallback(() => {
    setIsValid(true);
    setValueStr("");
    setValueNum(0);
    xValue.value = 0;
    onChangeRef.current.func(0);
  }, [xValue]);

  const onChangeText = useCallback((text: string) => {
    setValueStr(text);
  }, []);

  useEffect(() => {
    if (!valueStr) return;

    timeoutId.current = Timers.setTimeout(() => {
      const num = Number(valueStr);
      const validNum = isNaN(num) ? 0 : num;
      const valid = onChangeRef.current.isValid
        ? onChangeRef.current.isValid(validNum)
        : true;

      setIsValid(valid);
      if (!valid) {
        const value = 10;
        const duration = 50;
        xValue.value = withSequence(
          withTiming(-value, { duration }),
          withTiming(value, { duration: duration * 2 }),
          withTiming(-value, { duration: duration * 2 }),
          withTiming(value, { duration: duration * 2 }),
          withTiming(0, { duration }),
        );
        return;
      }

      xValue.value = 0;
      setValueNum(validNum);
      onChangeRef.current.func(validNum);
    }, onChangeRef.current.timeoutChange ?? 500);

    return () => {
      const shouldClean = onChangeRef.current.cleanTimeout?.() ?? true;

      if (shouldClean) Timers.clearTimeout(timeoutId.current);
      timeoutId.current = null;
    };
  }, [valueStr, xValue]);

  return {
    clear,
    isValid,
    valueStr,
    valueNum,
    onChangeText,
    styles: isValid
      ? null
      : [
          animatedStyle,
          {
            borderWidth: 1,
            borderColor: colors.error,
          },
        ],
  };
};
