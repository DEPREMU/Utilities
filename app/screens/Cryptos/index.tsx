/* eslint-disable indent */
import DisplayScreen from "./DisplayScreen";
import SelectionScreen from "./SelectionScreen";
import { BottomNavigation } from "react-native-paper";
import useStylesCryptosNavigator from "@styles/components/cryptos/useStylesCryptosNavigator";
import { loadDataSecure, logError, SelectedCryptos } from "@utils";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import chalk from "chalk";

const CryptosNavigator: React.FC = () => {
  const { styles, colors } = useStylesCryptosNavigator();

  const [index, setIndex] = useState<number>(0);
  const [selectedCryptos, setSelectedCryptos] = useState<SelectedCryptos>({});

  const handleSetSelectedCryptos = useCallback(
    (
      newValue: SelectedCryptos | ((prev: SelectedCryptos) => SelectedCryptos),
    ) => {
      setSelectedCryptos(newValue);
    },
    [],
  );

  const [routes] = useState([
    {
      key: "display",
      title: "Display",
      focusedIcon: "view-dashboard",
      unfocusedIcon: "view-dashboard-outline",
    },
    {
      key: "selection",
      title: "Selection",
      focusedIcon: "format-list-checks",
      unfocusedIcon: "format-list-bulleted",
    },
  ]);

  const renderScene = useCallback(
    ({ route }: { route: { key: string } }) => {
      switch (route.key) {
        case "display":
          return <DisplayScreen selectedCryptos={selectedCryptos} />;
        case "selection":
          return (
            <SelectionScreen
              setSelectedCryptos={handleSetSelectedCryptos}
              selectedCryptos={selectedCryptos}
            />
          );
        default:
          return null;
      }
    },
    [selectedCryptos, handleSetSelectedCryptos],
  );

  useEffect(() => {
    const loadSelectedCryptos = async () => {
      try {
        const storedCryptos = await loadDataSecure("_selectedCryptos");
        if (storedCryptos) setSelectedCryptos(storedCryptos);
      } catch (error) {
        logError(
          chalk.red("Error loading selected cryptocurrencies from storage"),
          error,
        );
      }
    };
    loadSelectedCryptos();
  }, []);

  return (
    <View style={styles.container}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={styles.tabBar}
        activeColor={colors.primary}
        inactiveColor={colors.accent}
      />
    </View>
  );
};

export default CryptosNavigator;
