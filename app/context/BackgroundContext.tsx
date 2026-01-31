import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  createContext,
} from "react";
import {
  logger,
  tTyped,
  REPLACERS,
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
import { navigateReplace, navigationRef } from "@navigation/navigationRef";
import { reloadAppAsync } from "expo";
import { functionsToExecute } from "@/utils/cross";
import { AppState, DeviceEventEmitter } from "react-native";

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

type StatesObj = {
  statePhone: typeDataReceivedState["state"] | null;
  hasInternet: boolean;
  isBackground: boolean;
};

type BackgroundContextType = {
  statesRef: React.RefObject<StatesObj>;
  statePhone: StatesObj["statePhone"];
  hasInternet: StatesObj["hasInternet"];
  isBackground: StatesObj["isBackground"];

  initIntervalTimeoutsRef: React.RefObject<
    (id: keyof TimeControls, data: dataTimeControl) => void
  >;
  deleteIntervalTimeoutRef: React.RefObject<
    <T extends keyof TimeControls>(id: T) => void
  >;
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

  const statesRef = useRef<StatesObj>({
    statePhone,
    hasInternet,
    isBackground,
  });
  statesRef.current.statePhone = statePhone;
  statesRef.current.hasInternet = hasInternet;
  statesRef.current.isBackground = isBackground;

  const timeControlsRef = React.useRef<TimeControls>({
    deviceInfo: null,
    clipboardWeb: null,
    refreshSession: null,
    locationEnabled: null,
  });

  const initIntervalTimeoutsRef = useRef(
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
  );

  const deleteIntervalTimeoutRef = useRef(
    <T extends keyof TimeControls>(id: T): void => {
      if (!timeControlsRef.current[id])
        throw new Error("Interval/Timeout not initialized");

      if (!timeControlsRef.current[id]?.id) return;

      if (timeControlsRef.current[id]?.type === "interval")
        clearIntervalPolyfill(timeControlsRef.current[id]?.id);
      else clearTimeoutPolyfill(timeControlsRef.current[id]?.id);

      timeControlsRef.current[id] = null;
    },
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        deleteIntervalTimeoutRef.current(key as keyof TimeControls);
      });
    };
  }, []);

  useEffect(() => {
    const id = setTimeoutPolyfill(() => {
      Object.entries(timeControlsRef.current).forEach(([key, data]) => {
        if (!data?.workWithInternet || !data.shouldRestartAuto) return;

        const typedKey = key as keyof TimeControls;

        if (!hasInternet) deleteIntervalTimeoutRef.current(typedKey);
        else if (!data.id) initIntervalTimeoutsRef.current(typedKey, data);
      });
    }, 1000);

    return () => clearTimeoutPolyfill(id);
  }, [hasInternet]);

  useEffect(() => {
    Object.entries(timeControlsRef.current).forEach(([key, data]) => {
      if (!data) return;
      if (!data.shouldStopWhenSuspend || !data.shouldRestartAuto) return;
      const typedKey = key as keyof TimeControls;

      if (statePhone === "suspended")
        deleteIntervalTimeoutRef.current(typedKey);
      else if (statePhone === "resumed" && !data.id)
        initIntervalTimeoutsRef.current(typedKey, data);
    });
  }, [statePhone]);

  useEffect(() => {
    if (!REPLACERS.isNative) return;
    //? All the logic to start the BackgroundModule and listen to events from Native

    const initializeBackgroundModule = async () => {
      let attempt = 0;
      while (!BackgroundModule.start && attempt < 5) {
        attempt++;
        await new Promise((resolve) => setTimeoutPolyfill(resolve, 1000));
        logger.log(
          `Waiting for BackgroundModule to be ready... Attempt ${attempt}`,
        );
      }

      if (!BackgroundModule.start) return reloadAppAsync();

      BackgroundModule?.start?.(
        tTyped("foregroundNotificationTitle"),
        tTyped("foregroundNotificationMessage"),
      );
    };

    initializeBackgroundModule();

    let timeoutId: number | null = null;

    functionsToExecute.current["AppState-change"]["setIsBackground"] = (
      newState,
    ) => {
      if (newState === "background") {
        if (!timeoutId)
          timeoutId = setTimeoutPolyfill(() => navigateReplace("Home"), 60000);
      } else if (timeoutId) {
        clearTimeoutPolyfill(timeoutId);
        timeoutId = null;
      }

      setIsBackground(newState !== "active");
    };

    const callbackNavigator = () => {
      const route = navigationRef.current?.getCurrentRoute();
      Object.values(functionsToExecute.current["Screen-change"]).forEach((fn) =>
        fn(route?.name || "Home"),
      );
    };

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      Object.values(functionsToExecute.current["AppState-change"]).forEach(
        (fn) => fn(nextAppState),
      );
    });
    navigationRef.current?.addListener("state", callbackNavigator);

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
      navigationRef.current?.removeListener("state", callbackNavigator);
      subscriptionIsAliveRN.remove();
      subscriptionStatePhone.remove();
      BackgroundModule.stop();
      if (timeoutId) clearTimeoutPolyfill(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!REPLACERS.isNative) return;

    const askPermissions = async () => {
      await askLocationPermission();
      await askDisplayOverOtherAppsPermission();
      await askBatteryOptimizationPermission();
    };

    const id = setTimeoutPolyfill(askPermissions, 2000);
    return () => clearTimeoutPolyfill(id);
  }, []);

  const value: BackgroundContextType = useMemo(
    () => ({
      statesRef,
      statePhone,
      hasInternet,
      isBackground,
      timeControlsRef,
      initIntervalTimeoutsRef,
      deleteIntervalTimeoutRef,
    }),
    [statePhone, hasInternet, isBackground],
  );

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
