import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  createContext,
} from "react";
import {
  loadDataSecure,
  setTimeoutPolyfill,
  setIntervalPolyfill,
  clearTimeoutPolyfill,
  askLocationPermission,
  clearIntervalPolyfill,
  hasInternetConnection,
  askBatteryOptimizationPermission,
  askDisplayOverOtherAppsPermission,
} from "@utils";
import { typeT } from "@types";
import ExpoUpdates from "expo-updates";
import { t as i18n } from "i18next";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import NativeFunctionsModule from "@/utils/modules/NativeFunctionsModule";
import { AppState, DeviceEventEmitter, Platform } from "react-native";

type ServiceData = {
  message: string;
  counter: number;
};

type dataTimeControl = {
  fn: (...args: unknown[]) => void;
  id?: NodeJS.Timeout | number;
  type: "interval" | "timeout";
  interval: number;
  workWithInternet: boolean;
};

type TimeControls = Record<
  "refreshSession" | "clipboardWeb" | "deviceInfo" | "locationEnabled",
  dataTimeControl | null
>;

type BackgroundContextType = {
  hasInternet: boolean;
  serviceData: ServiceData | null;
  isBackground: boolean;
  hasInternetRef: React.RefObject<boolean>;
  timeControlsRef: React.RefObject<TimeControls>;
  initIntervalTimeouts: (id: keyof TimeControls, data: dataTimeControl) => void;
  deleteIntervalTimeout: <T extends keyof TimeControls>(id: T) => void;
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
  const [serviceData, setServiceData] = useState<ServiceData | null>(null);
  const [hasInternet, setHasInternet] = useState<boolean>(true);
  const [isBackground, setIsBackground] = useState<boolean>(false);

  const hasInternetRef = useRef<boolean>(true);

  const timeControlsRef = React.useRef<TimeControls>({
    deviceInfo: null,
    clipboardWeb: null,
    refreshSession: null,
    locationEnabled: null,
  });

  const initIntervalTimeouts = useCallback(
    (id: keyof TimeControls, data: dataTimeControl) => {
      timeControlsRef.current[id] = {
        ...timeControlsRef.current[id],
        fn: data.fn,
        interval: data.interval,
        type: data.type,
        workWithInternet: data.workWithInternet,
      };

      if (timeControlsRef.current[id]?.id) {
        if (timeControlsRef.current[id]?.type === "interval")
          clearIntervalPolyfill(timeControlsRef.current[id]?.id);
        else clearTimeoutPolyfill(timeControlsRef.current[id]?.id);
      }

      if (data.type === "interval") {
        timeControlsRef.current[id] = {
          ...timeControlsRef.current[id],
          id: setIntervalPolyfill(data.fn, data.interval),
        };
      } else {
        timeControlsRef.current[id] = {
          ...timeControlsRef.current[id],
          id: setTimeoutPolyfill(data.fn, data.interval),
        };
      }
    },
    [],
  );

  const deleteIntervalTimeout = useCallback(
    <T extends keyof TimeControls>(id: T): void => {
      if (!timeControlsRef.current[id])
        throw new Error("Interval/Timeout not initialized");

      if (!timeControlsRef.current[id]?.id) return;

      if (timeControlsRef.current[id]?.type === "interval")
        clearIntervalPolyfill(timeControlsRef.current[id]?.id);
      else clearTimeoutPolyfill(timeControlsRef.current[id]?.id);

      timeControlsRef.current[id] = null;
    },
    [],
  );

  useEffect(() => {
    const id = setIntervalPolyfill(async () => {
      setHasInternet(await hasInternetConnection());
    }, 8000);

    return () => {
      clearIntervalPolyfill(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.entries(timeControlsRef.current).forEach(([key, data]) => {
        if (!data) return;
        deleteIntervalTimeout(key as keyof TimeControls);
      });
    };
  }, [deleteIntervalTimeout]);

  useEffect(() => {
    hasInternetRef.current = hasInternet;

    const id = setTimeoutPolyfill(() => {
      Object.entries(timeControlsRef.current).forEach(([key, data]) => {
        if (!data) return;
        if (!data.workWithInternet) return;

        const typedKey = key as keyof TimeControls;

        if (hasInternet) initIntervalTimeouts(typedKey, data);
        else deleteIntervalTimeout(typedKey);
      });
    }, 1000);

    return () => clearTimeoutPolyfill(id);
  }, [hasInternet, deleteIntervalTimeout, initIntervalTimeouts]);

  useEffect(() => {
    const initializeBackgroundModule = async () => {
      if (Platform.OS !== "android") return;

      let attempt = 0;
      while (!BackgroundModule.start && attempt < 5) {
        attempt++;
        await new Promise((resolve) => setTimeoutPolyfill(resolve, 1000));
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
    if (Platform.OS !== "android") return;

    const askPermissions = async () => {
      await askLocationPermission();
      await askDisplayOverOtherAppsPermission();
      await askBatteryOptimizationPermission();
    };

    const id = setTimeoutPolyfill(askPermissions, 2000);
    return () => clearTimeoutPolyfill(id);
  }, []);

  const value: BackgroundContextType = {
    hasInternet,
    serviceData,
    isBackground,
    hasInternetRef,
    timeControlsRef,
    initIntervalTimeouts,
    deleteIntervalTimeout,
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
