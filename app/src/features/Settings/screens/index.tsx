import { useMemo } from "react";
import { memoDeep } from "@/utils";
import Notifications from "./Notifications";
import SettingsScreen from "./Settings";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const SettingsNavigator = () => {
  const returnValue = useMemo(
    () =>
      GetBottomNavigation(
        [
          {
            key: "settings",
            title: "common.settings",
            focusedIcon: "cogs",
            unfocusedIcon: "cog",
          },
          {
            key: "notifications",
            title: "common.notifications",
            focusedIcon: "bell-cog",
            unfocusedIcon: "bell-sleep",
          },
        ],
        {
          settings: SettingsScreen,
          notifications: Notifications,
        },
      ),
    [],
  );

  return <>{returnValue()}</>;
};

export default memoDeep(SettingsNavigator);
