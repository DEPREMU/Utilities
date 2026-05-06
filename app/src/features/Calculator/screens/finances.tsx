import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { memoDeep } from "@utils";
import { useLanguage } from "@/context/LanguageContext";
import useStylesFinances from "@/features/Calculator/styles/useStylesFinances";

const Finances: React.FC = () => {
  const { styles } = useStylesFinances();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("calculator.finances.title")}</Text>
    </View>
  );
};

const FinancesMemo = memoDeep(Finances);

export default FinancesMemo;
