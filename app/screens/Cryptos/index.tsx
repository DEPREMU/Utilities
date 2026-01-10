import DisplayScreen from "./DisplayScreen";
import SelectionScreen from "./SelectionScreen";
import { SelectedCryptos } from "@common";
import GetBottomNavigation from "@components/common/GetBottomNavigation";
import { loadDataStorage, logError } from "@utils";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const CryptosNavigator = () => {
  const [selectedCryptos, setSelectedCryptos] = useState<SelectedCryptos>({});

  const handleSetSelectedCryptos = useCallback(
    (
      newValue: SelectedCryptos | ((prev: SelectedCryptos) => SelectedCryptos),
    ) => {
      setSelectedCryptos(newValue);
    },
    [],
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

  const returnValue = useMemo(
    () =>
      GetBottomNavigation(
        [
          {
            key: "display",
            title: "Cryptos.display",
            focusedIcon: "view-dashboard",
            unfocusedIcon: "view-dashboard-outline",
          },
          {
            key: "selection",
            title: "Cryptos.selection",
            focusedIcon: "format-list-checks",
            unfocusedIcon: "format-list-bulleted",
          },
        ],
        {
          display: () => <DisplayScreen selectedCryptos={selectedCryptos} />,
          selection: () => (
            <SelectionScreen
              setSelectedCryptos={handleSetSelectedCryptos}
              selectedCryptos={selectedCryptos}
            />
          ),
        },
      )(),
    [selectedCryptos, handleSetSelectedCryptos],
  );

  return <>{returnValue}</>;
};

export default CryptosNavigator;
