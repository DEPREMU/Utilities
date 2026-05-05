import { memoDeep } from "@utils";
import DownDetector from "./DownDetector";
import AddNewWebPage from "./AddNewWebPage";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";
import { useDownDetector } from "../services/zustand";
import React, { useEffect } from "react";

const Navigator = GetBottomNavigation(
  [
    {
      key: "DownDetector" as const,
      title: "downDetector.title",
      focusedIcon: "cloud-alert",
    },
    {
      key: "AddNewWebPage" as const,
      title: "downDetector.addNewWebPage",
      focusedIcon: "sync",
    },
  ],
  { DownDetector, AddNewWebPage },
);

const DownDetectorNavigator: React.FC = () => {
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
