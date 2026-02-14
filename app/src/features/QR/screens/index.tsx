import ScanQR from "./ScanQR";
import CreateQR from "./CreateQR";
import { useMemo } from "react";
import { memoDeep } from "@/utils";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const QRNavigator = () => {
  const returnValue = useMemo(
    () =>
      GetBottomNavigation(
        [
          {
            key: "CreateQR",
            title: "common.createQR",
            focusedIcon: "qrcode-plus",
          },
          {
            key: "ScanQR",
            title: "common.scanQR",
            focusedIcon: "qrcode",
          },
        ],
        {
          ScanQR,
          CreateQR,
        },
      ),
    [],
  );

  return <>{returnValue()}</>;
};

export default memoDeep(QRNavigator);
