import Clipboard from "./ClipboardScreen";
import { Screens } from "@types";
import SettingsClipboard from "./SettingsClipboard";
import SyncClipboardScreen from "./SyncClipboardScreen";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const ClipboardNavigator = GetBottomNavigation<Screens["Clipboard"]>([
  {
    key: "clipboard",
    title: "labels.clipboard",
    component: Clipboard,
    focusedIcon: "clipboard",
  },
  {
    key: "sync",
    title: "labels.sync",
    component: SyncClipboardScreen,
    focusedIcon: "sync",
  },
  {
    key: "settings",
    title: "clipboard.settings.title",
    component: SettingsClipboard,
    focusedIcon: "cog",
  },
]);

export default ClipboardNavigator;
