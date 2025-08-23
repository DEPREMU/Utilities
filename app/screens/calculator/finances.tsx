import React, { memo } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import useStylesFinances from "@styles/screens/calculator/useStylesFinances";

const Finances: React.FC = () => {
  const { styles } = useStylesFinances();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("finances")}</Text>
    </View>
  );
};

const FinancesMemo = memo(Finances);

export default FinancesMemo;
