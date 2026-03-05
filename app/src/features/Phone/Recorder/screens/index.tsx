import { memoDeep } from "@utils";
import RecorderScreen from "./Recorder";
import ListeningScreen from "./Listening";
import RecorderSettings from "./RecorderSettings";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const RecorderNavigator = GetBottomNavigation(
  [
    {
      key: "RecorderRecord" as const,
      title: "recorder.label",
      focusedIcon: "microphone",
      unfocusedIcon: "microphone-outline",
    },
    {
      key: "RecorderListening" as const,
      title: "recorder.recordedAudios",
      focusedIcon: "playlist-music",
      unfocusedIcon: "playlist-music-outline",
    },
    {
      key: "RecorderSettings" as const,
      title: "common.settings",
      focusedIcon: "cog",
      unfocusedIcon: "cog-outline",
    },
  ],
  {
    RecorderRecord: RecorderScreen,
    RecorderListening: ListeningScreen,
    RecorderSettings: RecorderSettings,
  },
);
export default memoDeep(RecorderNavigator);
