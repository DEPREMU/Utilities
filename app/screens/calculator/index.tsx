import Finances from "./finances";
import Calculator from "./calculator";
import { useLanguage } from "@context/LanguageContext";
import React, { useMemo, useState } from "react";
import { BottomNavigation } from "react-native-paper";

const CalculatorNavigator = () => {
  const { t } = useLanguage();

  const [index, setIndex] = useState<number>(0);

  const routes = useMemo(
    () => [
      { key: "calculator", title: t("calculator"), focusedIcon: "calculator" },
      { key: "finances", title: t("finances"), focusedIcon: "finance" },
    ],
    [t],
  );

  const renderScene = useMemo(
    () =>
      BottomNavigation.SceneMap({
        calculator: Calculator,
        finances: Finances,
      }),
    [],
  );

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
};

export default CalculatorNavigator;
