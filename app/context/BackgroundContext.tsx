import {
  loadDataSecure,
  askLocationPermission,
  askBatteryOptimizationPermission,
  askDisplayOverOtherAppsPermission,
} from "@utils";
import { typeT } from "@types";
import ExpoUpdates from "expo-updates";
import { t as i18n } from "i18next";
import _BackgroundTimer from "react-native-background-timer";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import NativeFunctionsModule from "@/utils/modules/NativeFunctionsModule";
import React, { createContext, useEffect } from "react";
import { AppState, DeviceEventEmitter, Platform } from "react-native";

type ServiceData = {
  message: string;
  counter: number;
};

type BackgroundContextType = {
  isBackground: boolean;
  serviceData: ServiceData | null;
};

const BackgroundContext = createContext<BackgroundContextType | undefined>(
  undefined,
);

interface BackgroundProviderProps {
  children: React.ReactNode;
}

export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({
  children,
}) => {
  const [isBackground, setIsBackground] = React.useState<boolean>(false);
  const [serviceData, setServiceData] = React.useState<ServiceData | null>(
    null,
  );

  useEffect(() => {
    const initializeBackgroundModule = async () => {
      if (Platform.OS !== "android") return;

      let attempt = 0;
      while (!BackgroundModule.start && attempt < 5) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!BackgroundModule.start) {
        ExpoUpdates.reloadAsync();
        return;
      }

      const t: typeT = i18n as typeT;

      loadDataSecure("_deviceId").then((deviceId) => {
        if (deviceId) return;
        NativeFunctionsModule?.requestIgnoreBatteryOptimizations?.();
      });
      BackgroundModule?.start?.(
        t("foregroundNotificationTitle"),
        t("foregroundNotificationMessage"),
      );
    };

    initializeBackgroundModule();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setIsBackground(nextAppState !== "active");
    });
    const subscriptionBackground = DeviceEventEmitter.addListener(
      "onUpdateCounterBackground",
      (data: ServiceData) => {
        setServiceData(data);
      },
    );

    return () => {
      subscription.remove();
      subscriptionBackground.remove();
      BackgroundModule.stop();
    };
  }, []);

  useEffect(() => {
    const askPermissions = async () => {
      await askLocationPermission();
      await askDisplayOverOtherAppsPermission();
      await askBatteryOptimizationPermission();
    };

    const id = _BackgroundTimer.setTimeout(askPermissions, 5000);
    return () => _BackgroundTimer.clearTimeout(id);
  }, []);

  const value: BackgroundContextType = {
    serviceData,
    isBackground,
  };

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = (): BackgroundContextType => {
  const context = React.useContext(BackgroundContext);
  if (!context) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
};
