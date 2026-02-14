import { View } from "react-native";
import { Cryptos } from "@types";
import { memoDeep } from "@utils";
import { PriceBinanceAPI } from "@common";
import useStylesCryptoItem from "@/features/Cryptos/styles/useStylesCryptoItem";
import React, { useCallback } from "react";
import { Checkbox, TextInput, Text } from "react-native-paper";

interface CryptoItemProps {
  item: PriceBinanceAPI[0];
  isSelected: boolean;
  crypto: Cryptos;
  onCheckBoxChange: (symbol: string) => void;
  onAmountChange: (amount: string, symbol: string) => void;
}

const CryptoItem: React.FC<CryptoItemProps> = ({
  item,
  isSelected,
  crypto,
  onCheckBoxChange,
  onAmountChange,
}) => {
  const { styles, primary, accent } = useStylesCryptoItem();

  const handlePress = useCallback(() => {
    onCheckBoxChange(item.symbol);
  }, [onCheckBoxChange, item.symbol]);

  const handleTextChange = useCallback(
    (text: string) => {
      onAmountChange(text, item.symbol);
    },
    [onAmountChange, item.symbol],
  );

  return (
    <View style={styles.checkBoxRow}>
      <Checkbox
        status={isSelected ? "checked" : "unchecked"}
        onPress={handlePress}
        color={primary}
        uncheckedColor={accent}
      />

      <Text style={styles.text}>{item.symbol}</Text>

      {isSelected && (
        <TextInput
          style={styles.inputAmount}
          keyboardType="numeric"
          placeholder="0.00"
          value={String(crypto?.amount || 0)}
          textColor="#f0f0f0"
          onChangeText={handleTextChange}
        />
      )}
    </View>
  );
};

const CryptoItemMemo = memoDeep(CryptoItem);

export default CryptoItemMemo;
