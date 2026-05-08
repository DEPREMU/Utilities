import { Screens } from "@types";
import ChangeImageFormat from "./ChangeImageFormat";
import { useImagesStore } from "../services/zustand";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";
import React, { useEffect } from "react";
import { deleteDirectoryPickerFolder, memoDeep, REPLACERS } from "@utils";

const ImagesNavigator = GetBottomNavigation([
  {
    key: "ChangeImageFormat",
    title: "images.changeImageFormatTabTitle",
    component: ChangeImageFormat,
    focusedIcon: "image-edit",
  },
]);

const Images: React.FC<Screens["Images"]> = () => {
  const cleanup = useImagesStore((s) => s.cleanup);

  useEffect(() => {
    const cleanupOnUnmount = () => {
      cleanup();
    };

    if (REPLACERS.isWeb) return cleanupOnUnmount;

    return () => {
      cleanupOnUnmount();
      deleteDirectoryPickerFolder();
    };
  }, [cleanup]);

  return <ImagesNavigator />;
};

export default memoDeep(Images);
