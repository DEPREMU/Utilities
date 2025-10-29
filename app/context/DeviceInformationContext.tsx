import React, {
  useState,
  ReactNode,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import axios from "axios";
import { logError } from "@utils";
import _BackgroundTimer from "react-native-background-timer";
import { DeviceInformation } from "@types";
import DeviceInfo, { PowerState } from "react-native-device-info";

interface DeviceInformationContextType {
  deviceInfo: DeviceInformation | null;
  loading: boolean;
  hasInternet: boolean;
  refreshDeviceInfo: () => Promise<void>;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInformation | null>(null);
  const [hasInternet, setHasInternet] = useState<boolean>(true);

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

  useEffect(() => {
    const url = "https://www.google.com/generate_204";
    const verifyInternetConnection = async () => {
      try {
        const res = await axios.get(url, { timeout: 5000 });
        setHasInternet([200, 204].includes(res.status));
      } catch {
        setHasInternet(false);
      }
    };

    const id = _BackgroundTimer.setInterval(verifyInternetConnection, 10000);

    return () => {
      _BackgroundTimer.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    refreshDeviceInfo();

    const handleIntervalDeviceInfo = async () => {
      const powerState = await DeviceInfo.getPowerState();
      setDeviceInfo((prev) => {
        const newValue: DeviceInformation = JSON.parse(
          JSON.stringify(prev || {}),
        );
        newValue.powerState = powerState as PowerState;
        return newValue;
      });
    };

    const interval = _BackgroundTimer.setInterval(
      handleIntervalDeviceInfo,
      60000,
    );

    return () => {
      _BackgroundTimer.clearInterval(interval);
    };
  }, [refreshDeviceInfo]);

  const value: DeviceInformationContextType = {
    loading,
    deviceInfo,
    hasInternet,
    refreshDeviceInfo,
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
