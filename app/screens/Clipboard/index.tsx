import Clipboard from "./ClipboardScreen";
import { useLanguage } from "@context/LanguageContext";
import React, { useMemo, useState } from "react";
import { BottomNavigation } from "react-native-paper";
import useStylesClipboardNavigator from "@styles/screens/clipboard/useStylesClipboardNavigator";
import SyncClipboardScreen from "./SyncClipboardScreen";

const ClipboardNavigator = () => {
  const { t } = useLanguage();
  const { styles, accent, primary } = useStylesClipboardNavigator();

  const [index, setIndex] = useState<number>(0);

  const routes = useMemo(
    () => [
      { key: "clipboard", title: t("clipboard"), focusedIcon: "clipboard" },
      { key: "sync", title: t("sync"), focusedIcon: "sync" },
    ],
    [t],
  );

  const renderScene = useMemo(
    () =>
      BottomNavigation.SceneMap({
        clipboard: Clipboard,
        sync: SyncClipboardScreen,
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

export default ClipboardNavigator;
