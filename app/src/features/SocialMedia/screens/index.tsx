import Streamers from "./Streamers";
import { Screens } from "@types";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const SocialMediaNavigator = GetBottomNavigation<Screens["SocialMedia"]>([
  {
    key: "Streamers",
    title: "streamers",
    component: Streamers,
    focusedIcon: "twitch",
  },
]);

export default SocialMediaNavigator;
