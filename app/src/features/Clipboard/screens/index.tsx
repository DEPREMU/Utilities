import Clipboard from "./ClipboardScreen";
import { memoDeep } from "@utils";
import SettingsClipboard from "./SettingsClipboard";
import SyncClipboardScreen from "./SyncClipboardScreen";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const ClipboardNavigator = GetBottomNavigation(
  [
    {
      key: "clipboard" as const,
      title: "labels.clipboard",
      focusedIcon: "clipboard",
    },
    {
      key: "sync" as const,
      title: "sync",
      focusedIcon: "sync",
    },
    {
      key: "settings" as const,
      title: "clipboard.settings.title",
      focusedIcon: "cog",
    },
  ],
  {
    sync: SyncClipboardScreen,
    settings: SettingsClipboard,
    clipboard: Clipboard,
  },
);

export default memoDeep(ClipboardNavigator);
