import React, { memo, useCallback, useEffect, useState } from "react";
import Button from "@components/common/ButtonComponent";
import { ScrollView, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import { logError } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import useStylesCalculator from "@styles/screens/calculator/useStylesCalculator";

const layout: string[][] = [
  ["c", "d", "(", ")"],
  ["π", "e", "/", "*"],
  ["7", "8", "9", "-"],
  ["4", "5", "6", "+"],
  ["1", "2", "3", "."],
  ["0"],
];

const Calculator: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesCalculator();

  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<string>("");

  const handlePressInput = useCallback((char: string) => {
    if (char === "c") return setInput("");
    if (char === "d") return setInput((prev) => prev.slice(0, -1));
    setInput((prev) => prev + char);
  }, []);

  useEffect(() => {
    if (!input || !t || input.trim().length === 0) return setResult("0");
    try {
      const value = eval(
        input
          .replace(/e/g, Math.E.toString())
          .replace(/π/g, Math.PI.toString())
          .replace(/,/g, "")
          .replace(/(\d)(\()/g, "$1*$2"),
      );
      if (!isFinite(value)) setResult("Error");
      else setResult(value.toString());
    } catch (error) {
      logError(error);
      setResult("Error");
    }
  }, [input, t]);

  const renderButtons = () =>
    layout.map((row, rowIndex) => (
      <View key={rowIndex} style={[styles.row]}>
        {row.map((char) => (
          <Button
            key={char}
            label={["d", "c"].includes(char) ? "" : char}
            children={
              char === "d" ? (
                <Icon source="backspace-outline" size={20} />
              ) : char === "c" ? (
                <Icon source="delete" size={20} />
              ) : null
            }
            replaceStyles={{
              button: styles.buttonInput,
              textButton: styles.buttonText,
            }}
            touchableOpacity
            handlePress={() => handlePressInput(char)}
          />
        ))}
      </View>
    ));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          <Text style={styles.input}>{input}</Text>
        </ScrollView>
        <Text style={styles.result}>{result}</Text>
      </View>
      <View style={styles.inputsCalculator}>{renderButtons()}</View>
    </View>
  );
};

const CalculatorMemo = memo(Calculator);

export default CalculatorMemo;
