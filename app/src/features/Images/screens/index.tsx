import { memoDeep } from "@utils";
import ChangeImageFormat from "./ChangeImageFormat";
import GetBottomNavigation from "@/common/components/BottomNavigator/components/GetBottomNavigation";

const ImagesNavigator = GetBottomNavigation(
  [
    {
      key: "changeImageFormat",
      title: "images.changeImageFormatTabTitle",
      focusedIcon: "image-edit",
    },
  ],
  {
    changeImageFormat: ChangeImageFormat,
  },
);

export default memoDeep(ImagesNavigator);
