import ForegroundModule from "@/utils/modules/ForegroundModule";
import { AppState, DeviceEventEmitter } from "react-native";
import React, { createContext, useEffect } from "react";
import { t } from "i18next";

interface ServiceData {
  message: string;
  counter: number;
}

interface ForegroundContextType {
  isForeground: boolean;
  serviceData: ServiceData | null;
}

const ForegroundContext = createContext<ForegroundContextType | undefined>(
  undefined,
);

interface ForegroundProviderProps {
  children: React.ReactNode;
}

export const ForegroundProvider: React.FC<ForegroundProviderProps> = ({
  children,
}) => {
  const [isForeground, setIsForeground] = React.useState<boolean>(false);
  const [serviceData, setServiceData] = React.useState<ServiceData | null>(
    null,
  );

  useEffect(() => {
    ForegroundModule?.start?.(
      t("foregroundNotificationTitle"),
      t("foregroundNotificationMessage"),
    );

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setIsForeground(nextAppState !== "active");
    });
    const subscriptionForeground = DeviceEventEmitter.addListener(
      "onUpdateCounterForeground",
      (data: ServiceData) => {
        setServiceData(data);
      },
    );

    return () => {
      subscription.remove();
      subscriptionForeground.remove();
      ForegroundModule.stop();
    };
  }, []);

  const value: ForegroundContextType = {
    serviceData,
    isForeground,
  };

  return (
    <ForegroundContext.Provider value={value}>
      {children}
    </ForegroundContext.Provider>
  );
};

export const useForeground = (): ForegroundContextType => {
  const context = React.useContext(ForegroundContext);
  if (!context) {
    throw new Error("useForeground must be used within a ForegroundProvider");
  }
  return context;
};
