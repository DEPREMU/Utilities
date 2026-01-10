import Clipboard from "./ClipboardScreen";
import SyncClipboardScreen from "./SyncClipboardScreen";
import GetBottomNavigation from "@components/common/GetBottomNavigation";

const ClipboardNavigator = GetBottomNavigation(
  [
    { key: "clipboard", title: "clipboard", focusedIcon: "clipboard" },
    { key: "sync", title: "sync", focusedIcon: "sync" },
  ],
  {
    clipboard: Clipboard,
    sync: SyncClipboardScreen,
  },
);

export default ClipboardNavigator;
