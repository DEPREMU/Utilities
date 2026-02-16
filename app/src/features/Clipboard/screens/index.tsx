import Clipboard from "./ClipboardScreen";
import SettingsClipboard from "./SettingsClipboard";
import SyncClipboardScreen from "./SyncClipboardScreen";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const ClipboardNavigator = GetBottomNavigation(
  [
    { key: "clipboard", title: "labels.clipboard", focusedIcon: "clipboard" },
    { key: "sync", title: "sync", focusedIcon: "sync" },
    { key: "settings", title: "clipboard.settings.title", focusedIcon: "cog" },
  ],
  {
    sync: SyncClipboardScreen,
    settings: SettingsClipboard,
    clipboard: Clipboard,
  },
);

export default ClipboardNavigator;
