import RecorderScreen from "./Recorder";
import ListeningScreen from "./Listening";
import RecorderSettings from "./RecorderSettings";
import GetBottomNavigation from "@components/common/GetBottomNavigation";

const RecorderNavigator = GetBottomNavigation(
  [
    {
      key: "RecorderRecord",
      title: "recorder.label",
      focusedIcon: "microphone",
      unfocusedIcon: "microphone-outline",
    },
    {
      key: "RecorderListening",
      title: "recorder.recordedAudios",
      focusedIcon: "playlist-music",
      unfocusedIcon: "playlist-music-outline",
    },
    {
      key: "RecorderSettings",
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
export default RecorderNavigator;
