import { View } from "react-native";
import DisplayScreen from "./DisplayScreen";
import SelectionScreen from "./SelectionScreen";
import { SelectedCryptos } from "@common";
import { BottomNavigation } from "react-native-paper";
import useStylesCryptosNavigator from "@styles/components/cryptos/useStylesCryptosNavigator";
import { loadDataStorage, logError } from "@utils";
import React, { useCallback, useEffect, useState } from "react";

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
        const storedCryptos = await loadDataStorage("SELECTED_CRYPTOS");
        if (storedCryptos) setSelectedCryptos(storedCryptos);
      } catch (error) {
        logError("Error loading selected cryptocurrencies from storage", error);
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
