import { Screens } from "@types";
import RecorderScreen from "./Recorder";
import ListeningScreen from "./Listening";
import RecorderSettings from "./RecorderSettings";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const RecorderNavigator = GetBottomNavigation<Screens["Recorder"]>([
  {
    key: "RecorderRecord",
    title: "recorder.label",
    component: RecorderScreen,
    focusedIcon: "microphone",
    unfocusedIcon: "microphone-outline",
  },
  {
    key: "RecorderListening",
    title: "recorder.recordedAudios",
    component: ListeningScreen,
    focusedIcon: "playlist-music",
    unfocusedIcon: "playlist-music-outline",
  },
  {
    key: "RecorderSettings",
    title: "common.settings",
    component: RecorderSettings,
    focusedIcon: "cog",
    unfocusedIcon: "cog-outline",
  },
]);

export default RecorderNavigator;
