import DisplayScreen from "./DisplayScreen";
import SelectionScreen from "./SelectionScreen";
import { SelectedCryptos } from "@common";
import GetBottomNavigation from "@components/common/GetBottomNavigation";
import { loadDataStorage, logError } from "@utils";
import React, { useRef, useMemo, useState, useEffect } from "react";

const CryptosNavigator = () => {
  const [selectedCryptos, setSelectedCryptos] = useState<SelectedCryptos>({});

  const handleSetSelectedCryptosRef = useRef(
    (
      newValue: SelectedCryptos | ((prev: SelectedCryptos) => SelectedCryptos),
    ) => {
      setSelectedCryptos(newValue);
    },
  );

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
              selectedCryptos={selectedCryptos}
              setSelectedCryptos={handleSetSelectedCryptosRef.current}
            />
          ),
        },
      )(),
    [selectedCryptos],
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

  return <>{returnValue}</>;
};

export default CryptosNavigator;
