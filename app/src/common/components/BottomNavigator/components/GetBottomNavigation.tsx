import { useLanguage } from "@context/LanguageContext";
import { BottomNavigation } from "react-native-paper";
import { AppTranslationsKeys } from "@types";
import useStylesBottomNavigator from "@components/BottomNavigator/styles/useStylesBottomNavigator";
import React, { useMemo, useState } from "react";

export type Route = {
  key: string;
  title: AppTranslationsKeys;
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
    const { colors } = useStylesBottomNavigator();

    const [index, setIndex] = useState<number>(0);

    const routesNavigator = useMemo(
      () =>
        routes.map((route) => ({
          ...route,
          title: t(...([route.title] as unknown as Parameters<typeof t>)),
        })),
      [t],
    );

    const renderScene = useMemo(() => BottomNavigation.SceneMap(sceneMap), []);

    return (
      <BottomNavigation
        shifting
        sceneAnimationEnabled
        barStyle={{ backgroundColor: colors.primary }}
        renderScene={renderScene}
        activeColor={colors.background}
        onIndexChange={setIndex}
        inactiveColor={colors.text}
        navigationState={{ index, routes: routesNavigator }}
      />
    );
  };

  return Component;
};

export default GetBottomNavigation;
