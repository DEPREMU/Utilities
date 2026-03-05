import Streamers from "./Streamers";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const SocialMediaNavigator = GetBottomNavigation(
  [{ key: "Streamers" as const, title: "streamers", focusedIcon: "twitch" }],
  { Streamers },
);

export default SocialMediaNavigator;
