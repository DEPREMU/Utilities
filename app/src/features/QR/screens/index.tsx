import ScanQR from "./ScanQR";
import CreateQR from "./CreateQR";
import { Screens } from "@types";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const QRNavigator = GetBottomNavigation<Screens["QR"]>([
  {
    key: "CreateQR",
    title: "common.createQR",
    component: CreateQR,
    focusedIcon: "qrcode-plus",
  },
  {
    key: "ScanQR",
    title: "common.scanQR",
    component: ScanQR,
    focusedIcon: "qrcode",
  },
]);

export default QRNavigator;
