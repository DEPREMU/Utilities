import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { BottomNavigation } from "react-native-paper";
import { AppTranslationsKeys } from "@types";
import React, { useMemo, useState } from "react";
import { useStylesBottomNavigator } from "@components/BottomNavigator/styles/useStylesBottomNavigator";

export type Route = {
  key: string;
  title: AppTranslationsKeys;
  component: Parameters<typeof BottomNavigation.SceneMap>[0][string];
  focusedIcon: string;
  unfocusedIcon?: string;
};

const GetBottomNavigation = <FC extends Record<string, unknown>>(
  routes: Route[],
) => {
  const renderScene = BottomNavigation.SceneMap(
    Object.fromEntries(routes.map((route) => [route.key, route.component])),
  );

  const Component: React.FC<FC> = () => {
    const { dynamicT } = useLanguage();
    const { colors } = useStylesBottomNavigator();

    const [index, setIndex] = useState<number>(0);

    const routesNavigator: Omit<Route, "sceneMap">[] = useMemo(
      () =>
        routes.map(
          ({ component: _, ...route }) =>
            ({
              ...route,
              title: dynamicT(route.title),
            }) as Omit<Route, "sceneMap">,
        ),
      [dynamicT],
    );

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

  return memoDeep(Component);
};

export default GetBottomNavigation;
