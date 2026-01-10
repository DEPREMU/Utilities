import { useLanguage } from "@context/LanguageContext";
import { BottomNavigation } from "react-native-paper";
import { typeLanguagesKeys } from "@types";
import useStylesBottomNavigator from "@styles/components/common/useStylesBottomNavigator";
import React, { useMemo, useState } from "react";

type Route = {
  key: string;
  title: typeLanguagesKeys;
  focusedIcon: string;
  unfocusedIcon?: string;
};

const GetBottomNavigation = <T extends Route[]>(
  routes: T,
  sceneMap: Record<
    T[number]["key"],
    Parameters<typeof BottomNavigation.SceneMap>[0][string]
  >,
) => {
  const Component = () => {
    const { t } = useLanguage();
    const { styles, colors } = useStylesBottomNavigator();

    const [index, setIndex] = useState<number>(0);

    const routesNavigator = useMemo(
      () =>
        routes.map((route) => ({
          ...route,
          title: t(route.title),
        })),
      [t],
    );

    const renderScene = useMemo(() => BottomNavigation.SceneMap(sceneMap), []);

    return (
      <BottomNavigation
        shifting
        sceneAnimationEnabled
        style={styles.tabBar}
        activeColor={colors.background}
        inactiveColor={colors.text}
        barStyle={{ backgroundColor: colors.primary }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        navigationState={{ index, routes: routesNavigator }}
      />
    );
  };

  return Component;
};

export default GetBottomNavigation;
