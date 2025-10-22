import { t } from "i18next";
import ExpoUpdates from "expo-updates";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import { loadDataSecure } from "@utils";
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
      if (Platform.OS === "android") return;
      let attempt = 0;
      while (!BackgroundModule.start && attempt < 5) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!BackgroundModule.start) {
        ExpoUpdates.reloadAsync();
        return;
      }

      loadDataSecure("_deviceId").then((deviceId) => {
        if (deviceId) return;
        BackgroundModule?.requestIgnoreBatteryOptimizations?.();
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
