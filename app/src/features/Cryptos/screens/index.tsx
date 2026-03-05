import DisplayScreen from "./DisplayScreen";
import SelectionScreen from "./SelectionScreen";
import { SelectedCryptos } from "@common";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";
import { storageManagement } from "@utils";
import React, { useRef, useMemo, useState } from "react";

const CryptosNavigator = () => {
  const [selectedCryptos, setSelectedCryptos] = useState<SelectedCryptos>(
    storageManagement.get("SELECTED_CRYPTOS", {}),
  );

  const handleSetSelectedCryptosRef = useRef(
    (
      newValue: SelectedCryptos | ((prev: SelectedCryptos) => SelectedCryptos),
    ) => {
      setSelectedCryptos(newValue);
    },
  );

  const Navigator = useMemo(
    () =>
      GetBottomNavigation(
        [
          {
            key: "display" as const,
            title: "Cryptos.display",
            focusedIcon: "view-dashboard",
            unfocusedIcon: "view-dashboard-outline",
          },
          {
            key: "selection" as const,
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
      ),
    [selectedCryptos],
  );

  return <Navigator />;
};

export default CryptosNavigator;
