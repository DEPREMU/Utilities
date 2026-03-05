import { memoDeep } from "@utils";
import Notifications from "./Notifications";
import SettingsScreen from "./Settings";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const SettingsNavigator = GetBottomNavigation(
  [
    {
      key: "settings" as const,
      title: "common.settings",
      focusedIcon: "cogs",
      unfocusedIcon: "cog",
    },
    {
      key: "notifications" as const,
      title: "common.notifications",
      focusedIcon: "bell-cog",
      unfocusedIcon: "bell-sleep",
    },
  ],
  {
    settings: SettingsScreen,
    notifications: Notifications,
  },
);

export default memoDeep(SettingsNavigator);
