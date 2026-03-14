import InfoIP from "./IP";
import NetworkInfo from "./NetworkInfo";
import { memoDeep } from "@utils";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const Navigator = GetBottomNavigation(
  [
    {
      key: "InfoIP" as const,
      title: "network.infoIP",
      focusedIcon: "ip",
    },
    {
      key: "NetworkInfo" as const,
      title: "network.networkInfo.title",
      focusedIcon: "help-network",
    },
  ],
  {
    InfoIP,
    NetworkInfo,
  },
);

export default memoDeep(Navigator);
