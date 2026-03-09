import ScanQR from "./ScanQR";
import CreateQR from "./CreateQR";
import { memoDeep } from "@/utils";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const QRNavigator = GetBottomNavigation(
  [
    {
      key: "CreateQR" as const,
      title: "common.createQR",
      focusedIcon: "qrcode-plus",
    },
    {
      key: "ScanQR" as const,
      title: "common.scanQR",
      focusedIcon: "qrcode",
    },
  ],
  {
    ScanQR,
    CreateQR,
  },
);

export default memoDeep(QRNavigator);
