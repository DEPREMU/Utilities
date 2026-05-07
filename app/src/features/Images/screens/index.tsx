import { Screens } from "@types";
import ChangeImageFormat from "./ChangeImageFormat";
import GetBottomNavigation from "@components/BottomNavigator/components/GetBottomNavigation";

const ImagesNavigator = GetBottomNavigation<Screens["Images"]>([
  {
    key: "ChangeImageFormat",
    title: "images.changeImageFormatTabTitle",
    component: ChangeImageFormat,
    focusedIcon: "image-edit",
  },
]);

export default ImagesNavigator;
