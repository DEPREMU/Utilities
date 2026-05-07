import { memoDeep } from "@utils";
import DownDetector from "./DownDetector";
import AddNewWebPage from "./AddNewWebPage";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";
import { useDownDetector } from "../services/zustand";
import React, { useEffect } from "react";
import { Screens } from "@types";

const Navigator = GetBottomNavigation([
  {
    key: "DownDetector",
    title: "downDetector.title",
    component: DownDetector,
    focusedIcon: "cloud-alert",
  },
  {
    key: "AddNewWebPage",
    title: "downDetector.addNewWebPage",
    component: AddNewWebPage,
    focusedIcon: "sync",
  },
]);

const DownDetectorNavigator: React.FC<Screens["DownDetector"]> = () => {
  const sync = useDownDetector((s) => s.sync);
  const cleanup = useDownDetector((s) => s.cleanup);

  useEffect(() => {
    sync();

    return () => {
      cleanup();
    };
  }, [sync, cleanup]);

  return <Navigator />;
};

export default memoDeep(DownDetectorNavigator);
