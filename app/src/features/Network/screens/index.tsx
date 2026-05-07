import InfoIP from "./IP";
import { Screens } from "@types";
import NetworkInfo from "./NetworkInfo";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const Navigator = GetBottomNavigation<Screens["Network"]>([
  {
    key: "InfoIP" as const,
    title: "network.infoIP",
    component: InfoIP,
    focusedIcon: "ip",
  },
  {
    key: "NetworkInfo",
    title: "network.networkInfo.title",
    component: NetworkInfo,
    focusedIcon: "help-network",
  },
]);

export default Navigator;
