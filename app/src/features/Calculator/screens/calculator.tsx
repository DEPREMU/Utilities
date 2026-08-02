import Button from "@/common/components/Button/screens";
import { memoDeep } from "@utils";
import { REPLACERS } from "@common";
import { Icon, Text } from "react-native-paper";
import { ScrollView, View } from "react-native";
import { useStylesCalculator } from "@screens/Calculator/styles/useStylesCalculator";
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
                textButton: styles.h3,
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
    if (!input || input.trim().length === 0) return setResult("0");

    try {
      const cleanInput = input
        .replace(/e/g, `(${Math.E})`)
        .replace(/π/g, `(${Math.PI})`)
        .replace(/,/g, "")
        .replace(/\)\s*\(/g, ")*(")
        .replace(/(\d)\s*\(/g, "$1*(")
        .replace(/\)\s*(\d)/g, ")*$1");

      const value = eval(cleanInput);
      if (!isFinite(value)) setResult("Error");
      else setResult(value.toString());
    } catch (error) {
      REPLACERS.Logger.error(
        error instanceof Error ? error.message : String(error),
      );
      setResult("Error");
    }
  }, [input]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScrollView
          style={styles.scrollViewContainer}
          contentContainerStyle={styles.scrollViewContentContainer}
        >
          <Text style={styles.input}>{input}</Text>
        </ScrollView>

        <Text style={styles.result}>{result}</Text>
      </View>

      <View style={styles.inputsCalculator}>{renderButtons}</View>
    </View>
  );
};

export default memoDeep(Calculator);
