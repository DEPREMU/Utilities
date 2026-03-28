import {
  tTyped,
  memoDeep,
  REPLACERS,
  deviceInfo,
  navigation,
  DATA_PLATFORM,
  EventsDeviceInfo,
} from "@utils";
import Button from "@/common/components/Button/screens";
import { View } from "react-native";
import { Route } from "@/common/components/BottomNavigator/components/GetBottomNavigation";
import VaultViewer from "@screens/Vault/screens/VaultViewer";
import ImportScreen from "@screens/Vault/screens/ImportScreen";
import BackupScreen from "@screens/Vault/screens/BackupScreen";
import SettingsScreen from "@screens/Vault/screens/SettingsScreen";
import { useLanguage } from "@context/LanguageContext";
import CompressionScreen from "@screens/Vault/screens/CompressionScreen";
import useStylesVaultScreen from "@screens/Vault/styles/useStylesVaultScreen";
import useStylesBottomNavigator from "@/common/components/BottomNavigator/styles/useStylesBottomNavigator";
import { BottomNavigation, Text } from "react-native-paper";
import { useVault, VaultProvider } from "@screens/Vault/context/VaultContext";
import React, { useMemo, useState, useEffect, useRef } from "react";

const routes: Route[] = [
  {
    key: "vault",
    title: "vault.title",
    focusedIcon: "folder-lock",
  },
  {
    key: "import",
    title: "vault.importFiles",
    focusedIcon: "file-import",
  },
  {
    key: "compression",
    title: "vault.compression",
    focusedIcon: "zip-box",
  },
  {
    key: "backup",
    title: "vault.backup.title",
    focusedIcon: "archive",
  },
  {
    key: "settings",
    title: "common.settings",
    focusedIcon: "cog",
  },
] as const;

export interface VaultScreenProps {
  useStylesVaultScreen: ReturnType<typeof useStylesVaultScreen>;
}

const VaultNavigator = () => {
  const { t } = useLanguage();
  const returnUseStyles = useStylesVaultScreen();
  const { functionsRef } = useVault();
  const { styles, colors } = useStylesBottomNavigator();

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
        title: t(route.title),
      })),
    [t],
  );

  const renderScene = useMemo(
    () =>
      BottomNavigation.SceneMap({
        vault: () => <VaultViewer useStylesVaultScreen={returnUseStyles} />,
        import: () => <ImportScreen useStylesVaultScreen={returnUseStyles} />,
        compression: () => (
          <CompressionScreen useStylesVaultScreen={returnUseStyles} />
        ),
        backup: () => <BackupScreen useStylesVaultScreen={returnUseStyles} />,
        settings: () => (
          <SettingsScreen useStylesVaultScreen={returnUseStyles} />
        ),
      }),
    [returnUseStyles],
  );

  useEffect(() => {
    functionsRef.current.unlock(callbackUnlockRef.current);

    const removeListener = deviceInfo.addEventListener(
      EventsDeviceInfo.isBackgroundChange,
      (isBackground) => {
        if (isBackground) functionsRef.current.lock(() => setIndex(-1));
        else functionsRef.current.unlock(callbackUnlockRef.current);
      },
    );

    return () => {
      removeListener();
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
      <View style={returnUseStyles.styles.lockedScreen}>
        <Text style={returnUseStyles.styles.lockedTitle}>
          {t("auth.authenticate")}
        </Text>
        <Text style={returnUseStyles.styles.lockedMessage}>
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
      style={styles.tabBar}
      barStyle={{ backgroundColor: colors.primary }}
      renderScene={renderScene}
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
