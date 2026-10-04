import { useStylesOtpInput } from "@screens/Auth/styles/useStylesOtpInput";
import { View, Text, Pressable, TextInput } from "react-native";
import React, { useRef, useState, useCallback } from "react";

export type OtpInputProps = {
  code: string;
  onChangeCode: (code: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
};

/**
 * 8-cell segmented OTP input component.
 * Uses an invisible TextInput layered with visual cell boxes to guarantee
 * consistent focus, auto-advance, backspace, and paste support across platforms.
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  code,
  onChangeCode,
  length = 8,
  disabled = false,
  hasError = false,
  autoFocus = true,
}) => {
  const { styles, colors } = useStylesOtpInput();
  const inputRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const handlePressContainer = useCallback(() => {
    if (disabled) return;
    inputRef.current?.focus();
  }, [disabled]);

  const handleTextChange = useCallback(
    (text: string) => {
      const sanitized = text
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, length);
      onChangeCode(sanitized);
    },
    [length, onChangeCode],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < length; i++) {
      const char = code[i] || "";
      const isCurrent = isFocused && i === code.length;
      const isLastFilled =
        isFocused && code.length === length && i === length - 1;
      const isActive = isCurrent || isLastFilled;

      let borderColor: string = colors.border;
      if (hasError) {
        borderColor = colors.error;
      } else if (isActive) {
        borderColor = colors.primary;
      } else if (char) {
        borderColor = colors.secondary;
      }

      cells.push(
        <View
          key={i}
          style={[
            styles.cell,
            {
              borderColor,
              backgroundColor: colors.background,
            },
            isActive && styles.cellActive,
          ]}
        >
          <Text
            style={[
              styles.cellText,
              {
                color: colors.text,
              },
            ]}
          >
            {char}
          </Text>
        </View>,
      );
    }
    return cells;
  };

  return (
    <Pressable
      onPress={handlePressContainer}
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel="Verification Code Input"
    >
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        keyboardType="default"
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        textContentType="oneTimeCode"
        style={styles.hiddenInput}
      />
      <View style={styles.cellsRow}>{renderCells()}</View>
    </Pressable>
  );
};

export default OtpInput;
