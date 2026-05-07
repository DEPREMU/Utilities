import { Screens } from "@types";
import Notifications from "./Notifications";
import SettingsScreen from "./Settings";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const SettingsNavigator = GetBottomNavigation<Screens["Settings"]>([
  {
    key: "settings",
    title: "common.settings",
    component: SettingsScreen,
    focusedIcon: "cogs",
    unfocusedIcon: "cog",
  },
  {
    key: "notifications",
    title: "common.notifications",
    component: Notifications,
    focusedIcon: "bell-cog",
    unfocusedIcon: "bell-sleep",
  },
]);

export default SettingsNavigator;
