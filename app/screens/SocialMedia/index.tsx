import Streamers from "./Streamers";
import GetBottomNavigation from "@components/common/GetBottomNavigation";

const SocialMediaNavigator = GetBottomNavigation(
  [{ key: "streamers", title: "streamers", focusedIcon: "twitch" }],
  {
    streamers: Streamers,
  },
);

export default SocialMediaNavigator;
