import { memoDeep } from "@utils";
import ChangeImageFormat from "./ChangeImageFormat";
import GetBottomNavigation from "@components/common/GetBottomNavigation";

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
