import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import TextInput from "@components/TextInput";
import { memoDeep } from "@utils";
import { useCryptoStore } from "../services";
import { PriceBinanceAPI } from "@common";
import { Checkbox, Divider } from "react-native-paper";
import React, { useCallback } from "react";
import { useStylesCryptoItem } from "@screens/Cryptos/styles/useStylesCryptoItem";

interface CryptoItemProps {
  item: PriceBinanceAPI[0];
  crypto: DB["TablesClient"]["Cryptos"];
  isSelected: boolean;
  onCheckBoxChange: (symbol: string) => void;
}

const CryptoItem: React.FC<CryptoItemProps> = ({
  item,
  crypto,
  isSelected,
  onCheckBoxChange,
}) => {
  const { styles, colors } = useStylesCryptoItem();
  const setIsWriting = useCryptoStore((s) => s.setIsWriting);
  const handleTextInputAmount = useCryptoStore((s) => s.handleTextInputAmount);

  const handleBlur = useCallback(() => {
    setIsWriting(false);
  }, [setIsWriting]);

  const handlePress = useCallback(() => {
    onCheckBoxChange(item.symbol);
    if (isSelected) handleBlur();
  }, [onCheckBoxChange, item.symbol, handleBlur, isSelected]);

  const handleTextChange = useCallback(
    (text: string) => {
      handleTextInputAmount(text, item.baseCoin, item.quoteCoin);
      setIsWriting(true);
    },
    [handleTextInputAmount, item.baseCoin, item.quoteCoin, setIsWriting],
  );

  return (
    <Animated.View
      style={styles.crypto}
      layout={LinearTransition.duration(200).springify()}
      exiting={FadeOutLeft.duration(200).springify()}
      entering={FadeInRight.duration(200).springify()}
    >
      <Animated.View
        style={styles.check}
        layout={LinearTransition.duration(300).springify()}
      >
        <Animated.Text
          style={styles.h3}
          layout={LinearTransition.duration(200).springify()}
        >
          {item.symbol}
        </Animated.Text>

        <Checkbox
          color={colors.primary}
          status={isSelected ? "checked" : "unchecked"}
          onPress={handlePress}
          uncheckedColor={colors.accent}
        />
      </Animated.View>

      {isSelected && (
        <Animated.View
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutRight.duration(200).springify()}
          entering={FadeInLeft.duration(200).springify()}
        >
          <Divider style={styles.divider} />

          <TextInput
            value={String(crypto?.amount ?? 0)}
            onBlur={handleBlur}
            placeholder="0.00"
            keyboardType="numeric"
            onChangeText={handleTextChange}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const CryptoItemMemo = memoDeep(CryptoItem);

export default CryptoItemMemo;
