import SyncScreen from "@components/Sync/screens/SyncScreen";
import { Screens } from "@types";
import { memoDeep } from "@utils";
import DisplayScreen from "./DisplayScreen";
import SettingsScreen from "./SettingsScreen";
import SelectionScreen from "./SelectionScreen";
import { useLanguage } from "@context/LanguageContext";
import { CryptoManager } from "../services";
import { useIsLoggedIn } from "@/common/hooks/useIsLoggedIn";
import { useCryptoStore } from "../services/cryptoZustand";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";
import React, { useEffect } from "react";

const Navigator = GetBottomNavigation([
  {
    key: "DisplayScreen",
    title: "cryptos.display",
    component: DisplayScreen,
    focusedIcon: "view-dashboard",
    unfocusedIcon: "view-dashboard-outline",
  },
  {
    key: "SelectionScreen",
    title: "cryptos.selection",
    component: SelectionScreen,
    focusedIcon: "format-list-checks",
    unfocusedIcon: "format-list-bulleted",
  },
  {
    key: "SettingsScreen",
    title: "common.settings",
    component: SettingsScreen,
    focusedIcon: "cog",
    unfocusedIcon: "cog-outline",
  },
]);

const CryptosNavigator: React.FC<Screens["Cryptos"]> = () => {
  const { t } = useLanguage();

  useIsLoggedIn();
  const sync = useCryptoStore((s) => s.sync);
  const loading = useCryptoStore((s) => s.loading);

  useEffect(() => {
    sync();

    return () => {
      CryptoManager.startTimer();
    };
  }, [sync]);

  return (
    <>
      {loading && (
        <SyncScreen
          visible
          description={t("cryptos.syncingSettingsDescription")}
        />
      )}
      <Navigator />
    </>
  );
};

export default memoDeep(CryptosNavigator);
