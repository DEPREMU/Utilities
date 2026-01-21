import Button from "@components/common/ButtonComponent";
import { Icon, Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import useStylesCalculator from "@styles/screens/calculator/useStylesCalculator";
import { ScrollView, View } from "react-native";
import { logError, memoDeep } from "@utils";
import React, { useEffect, useMemo, useRef, useState } from "react";

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

  const handlePressInputRef = useRef((char: string) => {
    if (char === "c") return setInput("");
    if (char === "d") return setInput((prev) => prev.slice(0, -1));
    setInput((prev) => prev + char);
  });

  const renderButtons = useMemo(
    () =>
      layout.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row]}>
          {row.map((char) => (
            <Button
              key={char}
              label={["d", "c"].includes(char) ? "" : char}
              replaceStyles={{
                button: styles.buttonInput,
                textButton: styles.buttonText,
              }}
              touchableOpacity
              handlePress={() => handlePressInputRef.current(char)}
            >
              {char === "d" ? (
                <Icon source="backspace-outline" size={20} />
              ) : char === "c" ? (
                <Icon source="delete" size={20} />
              ) : null}
            </Button>
          ))}
        </View>
      )),
    [styles],
  );

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
      <View style={styles.inputsCalculator}>{renderButtons}</View>
    </View>
  );
};

const CalculatorMemo = memoDeep(Calculator);

export default CalculatorMemo;
