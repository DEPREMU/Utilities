import React, {
  useState,
  ReactNode,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import { logError } from "@utils";
import { cloneDeep } from "lodash";
import { useBackground } from "./BackgroundContext";
import { DeviceInformation } from "@types";
import DeviceInfo, { PowerState } from "react-native-device-info";

interface DeviceInformationContextType {
  deviceInfo: DeviceInformation | null;
  loading: boolean;
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
    Object.entries(deviceInformationWithItsFunc).map(async ([key, func]) => {
      try {
        const funcTyped =
          func as (typeof deviceInformationWithItsFunc)[keyof DeviceInformation];
        const value = await DeviceInfo?.[funcTyped]?.();
        return [key, value];
      } catch (error) {
        logError(`Error getting device info for ${key}:`, error);
        return [key, null];
      }
    }),
  );

  return Object.fromEntries(info);
};

export const DeviceInformationProvider: React.FC<
  DeviceInformationProviderProps
> = ({ children }) => {
  const { initIntervalTimeouts, deleteIntervalTimeout } = useBackground();

  const [loading, setLoading] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInformation | null>(null);

  const refreshDeviceInfo = useCallback(async () => {
    setLoading(true);
    try {
      const info = await getDeviceInformation();
      setDeviceInfo(info);
    } catch (error) {
      logError("Error getting device information:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDeviceInfoRef = React.useRef(refreshDeviceInfo);
  useEffect(() => {
    refreshDeviceInfoRef.current = refreshDeviceInfo;
  }, [refreshDeviceInfo]);

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

    initIntervalTimeouts("deviceInfo", {
      fn: handleIntervalDeviceInfo,
      type: "interval",
      interval: 60000,
      workWithInternet: false,
      shouldRestartAuto: true,
      shouldStopWhenSuspend: false,
    });

    return () => {
      deleteIntervalTimeout("deviceInfo");
    };
  }, [refreshDeviceInfoRef, deleteIntervalTimeout, initIntervalTimeouts]);

  const value: DeviceInformationContextType = {
    loading,
    deviceInfo,
    refreshDeviceInfoRef,
  };

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
