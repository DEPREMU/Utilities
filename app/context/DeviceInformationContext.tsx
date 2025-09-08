import React, {
  useState,
  ReactNode,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import axios from "axios";
import DeviceInfo, { PowerState } from "react-native-device-info";
import { getRouteAPI, logError } from "@utils";
import { addNetworkStateListener } from "expo-network";

export type DeviceInformation = {
  deviceId: string;
  deviceName: string;
  brand: string;
  model: string;
  systemName: string;
  manufacturer: string;
  systemVersion: string;
  buildNumber: string;
  bundleId: string;
  powerState: PowerState;
  appVersion: string;
  isTablet: boolean;
  hostname: string[];
  host: string;
  startupTime: number;
  uniqueId: string;
  hardware: string;
  hasNotch: boolean;
  isCharging: boolean;
  totalMemory: number;
  usedMemory: number;
  totalStorage: number;
  freeStorage: number;
  carrier: string;
  ipAddress: string;
  macAddress: string;
  isEmulator: boolean;
  userAgent: string;
};

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

export const DeviceInformationProvider: React.FC<
  DeviceInformationProviderProps
> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInformation | null>(null);
  const [hasInternet, setHasInternet] = useState<boolean>(true);

  const getDeviceInformation =
    useCallback(async (): Promise<DeviceInformation> => {
      const info = await Promise.all(
        Object.entries(deviceInformationWithItsFunc).map(
          async ([key, func]) => {
            const funcTyped =
              func as (typeof deviceInformationWithItsFunc)[keyof DeviceInformation];
            const value = await DeviceInfo?.[funcTyped]?.();

            return [key, value];
          },
        ),
      );

      return Object.fromEntries(info);
    }, []);

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
  }, [getDeviceInformation]);

  useEffect(() => {
    const listener = addNetworkStateListener((values) => {
      const { isConnected, isInternetReachable } = values;
      setHasInternet(!!isConnected && !!isInternetReachable);
    });

    const id = setInterval(async () => {
      try {
        const res = await axios.get(await getRouteAPI("/health"), {
          timeout: 5000,
        });
        const data = res?.data || { status: null };
        setHasInternet(data?.status === "running");
      } catch {
        setHasInternet(false);
      }
    }, 10000);

    return () => {
      clearInterval(id);
      listener.remove();
    };
  }, []);

  useEffect(() => {
    refreshDeviceInfo();

    const interval = setInterval(async () => {
      const powerState = await DeviceInfo.getPowerState();
      setDeviceInfo((prev) => {
        const newValue: DeviceInformation = JSON.parse(
          JSON.stringify(prev || {}),
        );
        newValue.powerState = powerState as PowerState;
        return newValue;
      });
    }, 60000);

    return () => clearInterval(interval);
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
