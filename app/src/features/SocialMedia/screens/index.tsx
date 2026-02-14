import Streamers from "./Streamers";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const SocialMediaNavigator = GetBottomNavigation(
  [{ key: "streamers", title: "streamers", focusedIcon: "twitch" }],
  {
    streamers: Streamers,
  },
);

export default SocialMediaNavigator;
