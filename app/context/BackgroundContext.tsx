import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  createContext,
} from "react";
import {
  log,
  tTyped,
  loadDataStorage,
  setTimeoutPolyfill,
  setIntervalPolyfill,
  clearTimeoutPolyfill,
  askLocationPermission,
  clearIntervalPolyfill,
  hasInternetConnection,
  askBatteryOptimizationPermission,
  askDisplayOverOtherAppsPermission,
} from "@utils";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import { reloadAppAsync } from "expo";
import NativeFunctionsModule from "@/utils/modules/NativeFunctionsModule";
import { AppState, DeviceEventEmitter, Platform } from "react-native";

type typeDataReceivedState = { state: "suspended" | "resumed" };

type dataTimeControl = {
  fn: (...args: unknown[]) => void;
  id?: number;
  type: "interval" | "timeout";
  interval: number;
  workWithInternet: boolean;
  shouldRestartAuto?: boolean;
  shouldStopWhenSuspend: boolean;
};

type TimeControls = Record<
  "refreshSession" | "clipboardWeb" | "deviceInfo" | "locationEnabled",
  dataTimeControl | null
>;

type BackgroundContextType = {
  statePhone: typeDataReceivedState["state"] | null;
  hasInternet: boolean;
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
  const [hasInternet, setHasInternet] = useState<boolean>(true);
  const [isBackground, setIsBackground] = useState<boolean>(false);
  const [statePhone, setStatePhone] =
    useState<typeDataReceivedState["state"]>("resumed");

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
        shouldStopWhenSuspend: !!data.shouldStopWhenSuspend,
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
        if (!data?.workWithInternet || !data.shouldRestartAuto) return;

        const typedKey = key as keyof TimeControls;

        if (!hasInternet) deleteIntervalTimeout(typedKey);
        else if (!data.id) initIntervalTimeouts(typedKey, data);
      });
    }, 1000);

    return () => clearTimeoutPolyfill(id);
  }, [hasInternet, deleteIntervalTimeout, initIntervalTimeouts]);

  useEffect(() => {
    Object.entries(timeControlsRef.current).forEach(([key, data]) => {
      if (!data) return;
      if (!data.shouldStopWhenSuspend || !data.shouldRestartAuto) return;
      const typedKey = key as keyof TimeControls;

      if (statePhone === "suspended") deleteIntervalTimeout(typedKey);
      else if (statePhone === "resumed" && !data.id)
        initIntervalTimeouts(typedKey, data);
    });
  }, [statePhone, deleteIntervalTimeout, initIntervalTimeouts]);

  useEffect(() => {
    const initializeBackgroundModule = async () => {
      if (Platform.OS !== "android") return;

      let attempt = 0;
      while (!BackgroundModule.start && attempt < 5) {
        attempt++;
        await new Promise((resolve) => setTimeoutPolyfill(resolve, 1000));
        log(`Waiting for BackgroundModule to be ready... Attempt ${attempt}`);
      }

      if (!BackgroundModule.start) return reloadAppAsync();

      loadDataStorage("_deviceId").then(
        (deviceId) =>
          !deviceId &&
          NativeFunctionsModule?.requestIgnoreBatteryOptimizations?.(),
      );
      BackgroundModule?.start?.(
        tTyped("foregroundNotificationTitle"),
        tTyped("foregroundNotificationMessage"),
      );
    };

    initializeBackgroundModule();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setIsBackground(nextAppState !== "active");
    });
    const subscriptionStatePhone = DeviceEventEmitter.addListener(
      "onUpdateSuspendResume",
      (data: typeDataReceivedState) => {
        setStatePhone(data.state || "resumed");
      },
    );
    const subscriptionIsAliveRN = DeviceEventEmitter.addListener(
      "queryAppState",
      () => BackgroundModule.setReactAlive(true),
    );

    return () => {
      subscription.remove();
      subscriptionIsAliveRN.remove();
      subscriptionStatePhone.remove();
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
    statePhone,
    hasInternet,
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
