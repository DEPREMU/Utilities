import {
  tTyped,
  memoDeep,
  REPLACERS,
  deviceInfo,
  navigation,
  DATA_PLATFORM,
  EventsDeviceInfo,
} from "@utils";
import Button from "@components/Button/screens";
import { View } from "react-native";
import { Route } from "@components/BottomNavigator/components/GetBottomNavigation";
import { Screens } from "@types";
import VaultViewer from "@screens/Vault/screens/VaultViewer";
import ImportScreen from "@screens/Vault/screens/ImportScreen";
import BackupScreen from "@screens/Vault/screens/BackupScreen";
import SettingsScreen from "@screens/Vault/screens/SettingsScreen";
import { useLanguage } from "@context/LanguageContext";
import CompressionScreen from "@screens/Vault/screens/CompressionScreen";
import { useStylesVaultScreen } from "@screens/Vault/styles/useStylesVaultScreen";
import { BottomNavigation, Text } from "react-native-paper";
import { useVault, VaultProvider } from "@screens/Vault/context/VaultContext";
import { useStylesBottomNavigator } from "@components/BottomNavigator/styles/useStylesBottomNavigator";
import React, { useMemo, useState, useEffect, useRef } from "react";

const routes: Route[] = [
  {
    key: "vault",
    title: "vault.title",
    component: VaultViewer,
    focusedIcon: "folder-lock",
  },
  {
    key: "import",
    title: "vault.importFiles",
    component: ImportScreen,
    focusedIcon: "file-import",
  },
  {
    key: "compression",
    title: "vault.compression",
    component: CompressionScreen,
    focusedIcon: "zip-box",
  },
  {
    key: "backup",
    title: "vault.backup.title",
    component: BackupScreen,
    focusedIcon: "archive",
  },
  {
    key: "settings",
    title: "common.settings",
    component: SettingsScreen,
    focusedIcon: "cog",
  },
] as const;

export interface VaultScreenProps {
  useStylesVaultScreen: ReturnType<typeof useStylesVaultScreen>;
}

const renderSceneMap = BottomNavigation.SceneMap(
  Object.fromEntries(routes.map((route) => [route.key, route.component])),
);

const VaultNavigator: React.FC<Screens["Vault"]> = () => {
  const { styles } = useStylesVaultScreen();
  const { colors } = useStylesBottomNavigator();
  const { t, dynamicT } = useLanguage();
  const { functionsRef } = useVault();

  const [index, setIndex] = useState<number>(-1);

  const callbackUnlockRef = useRef((success: boolean) => {
    setIndex((prev) => {
      if (success && prev === -1) return 0;
      if (!success) return -1;
      return prev;
    });
  });

  const routesNavigator = useMemo(
    () =>
      routes.map((route) => ({
        ...route,
        title: dynamicT(route.title),
      })),
    [dynamicT],
  );

  useEffect(() => {
    functionsRef.current.unlock(callbackUnlockRef.current);

    const isBackgroundListener = deviceInfo.addEventListener(
      EventsDeviceInfo.isBackgroundChange,
      (isBackground) => {
        if (isBackground) functionsRef.current.lock(() => setIndex(-1));
        else functionsRef.current.unlock(callbackUnlockRef.current);
      },
    );

    return () => {
      isBackgroundListener.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      functionsRef.current.lock();
    };
  }, [functionsRef]);

  useEffect(() => {
    if (REPLACERS.isNative || DATA_PLATFORM.isElectron) return;

    alert(tTyped("vault.unsupportedPlatformAlert"));
    navigation.replace("Home");
  }, []);

  if (index === -1)
    return (
      <View style={styles.container}>
        <Text style={styles.lockedTitle}>{t("auth.authenticate")}</Text>
        <Text style={styles.lockedMessage}>
          {t("auth.authenticateMessage")}
        </Text>

        <Button
          label={tTyped("auth.authenticate")}
          handlePress={() =>
            functionsRef.current.unlock(callbackUnlockRef.current)
          }
        />
      </View>
    );

  return (
    <BottomNavigation
      shifting
      sceneAnimationEnabled
      barStyle={{ backgroundColor: colors.primary }}
      renderScene={renderSceneMap}
      activeColor={colors.background}
      onIndexChange={setIndex}
      inactiveColor={colors.text}
      navigationState={{ index, routes: routesNavigator }}
    />
  );
};

const VaultNavigatorMemo = memoDeep(() => (
  <VaultProvider>
    <VaultNavigator />
  </VaultProvider>
));

export default VaultNavigatorMemo;
