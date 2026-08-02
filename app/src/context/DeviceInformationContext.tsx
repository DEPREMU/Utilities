import React, {
  useRef,
  useMemo,
  useState,
  ReactNode,
  useEffect,
  useContext,
  createContext,
} from "react";
import { cloneDeep } from "lodash";
import { REPLACERS } from "@common";
import { useBackground } from "./BackgroundContext";
import { getFormattedDate } from "@utils";
import { DeviceInformation } from "@types";
import DeviceInfo, { PowerState } from "react-native-device-info";

interface DeviceInformationContextType {
  deviceInfo: DeviceInformation | null;
  refreshDeviceInfoRef: React.RefObject<() => Promise<void>>;
}

const DeviceInformationContext = createContext<
  DeviceInformationContextType | undefined
>(undefined);

interface DeviceInformationProviderProps {
  children: ReactNode;
}

const deviceInformationWithItsFunc = {
  uniqueId: "getUniqueId",
  deviceId: "getDeviceId",
  deviceName: "getDeviceName",
  brand: "getBrand",
  model: "getModel",
  systemName: "getSystemName",
  systemVersion: "getSystemVersion",
  buildNumber: "getBuildNumber",
  bundleId: "getBundleId",
  powerState: "getPowerState",
  appVersion: "getVersion",
  isTablet: "isTablet",
  hasNotch: "hasNotch",
  isCharging: "isBatteryCharging",
  totalMemory: "getTotalMemory",
  usedMemory: "getUsedMemory",
  totalStorage: "getTotalDiskCapacity",
  freeStorage: "getFreeDiskStorage",
  carrier: "getCarrier",
  ipAddress: "getIpAddress",
  macAddress: "getMacAddress",
  isEmulator: "isEmulator",
  userAgent: "getUserAgent",
  manufacturer: "getManufacturer",
  hostname: "getHostNames",
  host: "getHost",
  startupTime: "getStartupTime",
  hardware: "getHardware",
} as const;

const getDeviceInformation = async (): Promise<DeviceInformation> => {
  const info = await Promise.all(
    Object.entries(deviceInformationWithItsFunc).map(async ([_, func]) => {
      const key = _ as keyof DeviceInformation;

      try {
        const funcTyped = func as (typeof deviceInformationWithItsFunc)[Exclude<
          keyof DeviceInformation,
          "batteryLevel" | "batteryState" | "lowPowerMode"
        >];
        let value = await DeviceInfo?.[funcTyped]?.();

        if (key === "startupTime" && value !== -1)
          value = getFormattedDate(new Date(value as number));

        return [key, value];
      } catch (error) {
        REPLACERS.Logger.error(`Error getting device info for ${key}:`, error);
        return [key, null];
      }
    }),
  );

  return Object.fromEntries(info);
};

export const DeviceInformationProvider: React.FC<
  DeviceInformationProviderProps
> = ({ children }) => {
  const { initIntervalTimeoutsRef, deleteIntervalTimeoutRef } = useBackground();

  const [deviceInfo, setDeviceInfo] = useState<DeviceInformation | null>(null);

  const refreshDeviceInfoRef = useRef(async () => {
    try {
      const info = await getDeviceInformation();
      setDeviceInfo(info);
    } catch (error) {
      REPLACERS.Logger.error("Error getting device information:", error);
    }
  });

  useEffect(() => {
    refreshDeviceInfoRef.current();

    const handleIntervalDeviceInfo = async () => {
      const powerState = await DeviceInfo.getPowerState();
      setDeviceInfo((prev) => {
        const newValue = cloneDeep(prev || {}) as DeviceInformation;
        newValue.powerState = powerState as PowerState;
        return newValue;
      });
    };

    initIntervalTimeoutsRef.current("deviceInfo", {
      fn: handleIntervalDeviceInfo,
      type: "interval",
      interval: 60000,
      workWithInternet: false,
      shouldRestartAuto: true,
      shouldStopWhenSuspend: false,
    });

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      deleteIntervalTimeoutRef.current("deviceInfo");
    };
  }, [deleteIntervalTimeoutRef, initIntervalTimeoutsRef]);

  const value: DeviceInformationContextType = useMemo(
    () => ({
      deviceInfo,
      refreshDeviceInfoRef,
    }),
    [deviceInfo],
  );
  return (
    <DeviceInformationContext.Provider value={value}>
      {children}
    </DeviceInformationContext.Provider>
  );
};

export const useDeviceInformation = (): DeviceInformationContextType => {
  const context = useContext(DeviceInformationContext);
  if (context !== undefined) return context;

  throw new Error(
    "useDeviceInformation must be used within a DeviceInformationProvider",
  );
};
