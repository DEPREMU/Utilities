import Streamers from "./Streamers";
import { useLanguage } from "@context/LanguageContext";
import { BottomNavigation } from "react-native-paper";
import React, { useMemo, useState } from "react";
import useStylesSocialMediaNavigator from "@styles/screens/SocialMedia/useStylesSocialMediaNavigator";

const SocialMediaNavigator = () => {
  const { styles, accent, primary } = useStylesSocialMediaNavigator();
  const { t } = useLanguage();

  const [index, setIndex] = useState<number>(0);

  const routes = useMemo(
    () => [{ key: "streamers", title: t("streamers"), focusedIcon: "twitch" }],
    [t],
  );

  const renderScene = useMemo(
    () =>
      BottomNavigation.SceneMap({
        streamers: Streamers,
      }),
    [],
  );

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      barStyle={styles.tabBar}
      activeColor={primary}
      inactiveColor={accent}
    />
  );
};

export default SocialMediaNavigator;
