import {
  logger,
  tTyped,
  REPLACERS,
  deviceInfo,
  setTimeoutPolyfill,
  setIntervalPolyfill,
  clearTimeoutPolyfill,
  clearIntervalPolyfill,
} from "@utils";
import { reloadAppAsync } from "expo";
import { navigateReplace } from "@refs";
import { BackgroundModule } from "@modules";
import React, { useRef, useMemo, useEffect, createContext } from "react";

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
  "clipboardWeb" | "deviceInfo" | "locationEnabled",
  dataTimeControl | null
>;

type BackgroundContextType = {
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
  const timeControlsRef = React.useRef<TimeControls>({
    deviceInfo: null,
    clipboardWeb: null,
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
    const remove = deviceInfo.addEventListener(
      "hasInternet-change",
      (hasInternet) => {
        Object.entries(timeControlsRef.current).forEach(([key, data]) => {
          if (!data?.workWithInternet || !data.shouldRestartAuto) return;

          const typedKey = key as keyof TimeControls;

          if (!hasInternet) deleteIntervalTimeoutRef.current(typedKey);
          else if (!data.id) initIntervalTimeoutsRef.current(typedKey, data);
        });
      },
    );

    return () => remove();
  }, []);

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

    const removeStatePhoneListener = deviceInfo.addEventListener(
      "statePhone-change",
      (statePhone) => {
        Object.entries(timeControlsRef.current).forEach(([key, data]) => {
          if (!data) return;
          if (!data.shouldStopWhenSuspend || !data.shouldRestartAuto) return;
          const typedKey = key as keyof TimeControls;

          if (statePhone === "suspended")
            deleteIntervalTimeoutRef.current(typedKey);
          else if (statePhone === "resumed" && !data.id)
            initIntervalTimeoutsRef.current(typedKey, data);
        });
      },
    );

    const removeAppStateListener = deviceInfo.addEventListener(
      "appState-change",
      (newState) => {
        if (newState === "background") {
          if (!timeoutId)
            timeoutId = setTimeoutPolyfill(
              () => navigateReplace("Home"),
              60000,
            );
        } else if (timeoutId) {
          clearTimeoutPolyfill(timeoutId);
          timeoutId = null;
        }
      },
    );

    return () => {
      if (timeoutId) clearTimeoutPolyfill(timeoutId);
      removeAppStateListener();
      removeStatePhoneListener();
    };
  }, []);

  const value: BackgroundContextType = useMemo(
    () => ({
      timeControlsRef,
      initIntervalTimeoutsRef,
      deleteIntervalTimeoutRef,
    }),
    [],
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
