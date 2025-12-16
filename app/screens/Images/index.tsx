import { memoDeep } from "@/utils";
import { useLanguage } from "@context/LanguageContext";
import ChangeImageFormat from "./ChangeImageFormat";
import { BottomNavigation } from "react-native-paper";
import useStylesImagesNavigator from "@styles/screens/Images/useStylesImagesNavigator";
import React, { useMemo, useState } from "react";

const ImagesNavigator = () => {
  const { t } = useLanguage();
  const { styles, accent, primary } = useStylesImagesNavigator();

  const [index, setIndex] = useState<number>(0);

  const routes = useMemo(
    () => [
      {
        key: "changeImageFormat",
        title: t("images.changeImageFormatTabTitle"),
        focusedIcon: "image-edit",
      },
    ],
    [t],
  );

  const renderScene = useMemo(
    () =>
      BottomNavigation.SceneMap({
        changeImageFormat: ChangeImageFormat,
      }),
    [],
  );

  return (
    <BottomNavigation
      barStyle={styles.tabBar}
      activeColor={primary}
      renderScene={renderScene}
      inactiveColor={accent}
      onIndexChange={setIndex}
      navigationState={{ index, routes }}
    />
  );
};

export default memoDeep(ImagesNavigator);
