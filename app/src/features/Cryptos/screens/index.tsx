import SyncScreen from "@components/Sync/screens/SyncScreen";
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

const Navigator = GetBottomNavigation(
  [
    {
      key: "DisplayScreen" as const,
      title: "Cryptos.display",
      focusedIcon: "view-dashboard",
      unfocusedIcon: "view-dashboard-outline",
    },
    {
      key: "SelectionScreen" as const,
      title: "Cryptos.selection",
      focusedIcon: "format-list-checks",
      unfocusedIcon: "format-list-bulleted",
    },
    {
      key: "SettingsScreen" as const,
      title: "common.settings",
      focusedIcon: "cog",
      unfocusedIcon: "cog-outline",
    },
  ],
  {
    DisplayScreen,
    SettingsScreen,
    SelectionScreen,
  },
);

const CryptosNavigator = () => {
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
          description={t("Cryptos.syncingSettingsDescription")}
        />
      )}
      <Navigator />
    </>
  );
};

export default memoDeep(CryptosNavigator);
