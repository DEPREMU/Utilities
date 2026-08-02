import {
  tTyped,
  Network,
  deviceInfo,
  navigation,
  EventsDeviceInfo,
} from "@utils";
import axios from "axios";
import { modalRef } from "@refs";
import ComputerItem from "../components/ComputerItem";
import { useLanguage } from "@context/LanguageContext";
import { Timers, REPLACERS } from "@common";
import Zeroconf, { Service } from "react-native-zeroconf";
import { useStylesComputerControl } from "@screens/Phone/ComputesControl/styles/useStylesComputerControl";
import { AdvertisementTXT, Screens } from "@types";
import Animated, { LinearTransition } from "react-native-reanimated";
import { ActivityIndicator, Text, FAB } from "react-native-paper";
// eslint-disable-next-line react-native/split-platform-components
import { View, PermissionsAndroid, Platform, Permission } from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";

export type Device = ServiceAdvertisementTXT & {
  url: string;
  deviceId: string;
};
type ServiceAdvertisementTXT = Service & { txt: AdvertisementTXT };

export type ExecuteCommandOnDevice = (
  baseUrl: string,
  deviceId: string,
  command: "turn-off-computer" | "restart-computer",
) => Promise<void>;

const TAG = "ComputerControl";

const getUrl = (host: string, port: number): string => {
  return `http://${host}:${port}/status`;
};

const tryUrls = async (
  service: ServiceAdvertisementTXT,
): Promise<string | null> => {
  const candidates = [
    getUrl(service.host, service.port),
    getUrl(service.txt.lanIP, service.port),
    ...service.addresses.map((addr) => getUrl(addr, service.port)),
  ]
    .filter((url) => !!url?.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/status$/))
    .filter((v, i, a) => a.indexOf(v) === i);

  let resolved = false;

  return await new Promise((resolve: (value: string | null) => void) => {
    const id = Timers.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 5000);

    candidates.forEach(async (url) => {
      try {
        if (await Network.isOnlineUrl(url, "get", 2000)) {
          if (!resolved) {
            resolved = true;
            Timers.clearTimeout(id);
            resolve(url.replace("/status", ""));
          }
        }
      } catch (error) {
        REPLACERS.Logger.error(
          TAG,
          `Error while fetching ${url}:`,
          (error as Error).message,
        );
      }
    });
  });
};

const devicesDev: Device[] = Array.from({ length: 5 }).map((_, i) => {
  const ip = `192.168.1.${100 + i}`;

  return {
    name: "Test-PC" + i,
    host: ip,
    port: 3000,
    addresses: [ip],
    fullName: "Test-PC._http._tcp.local.",
    deviceId: "test-device-id",
    txt: {
      deviceId: "test-device-id",
      lanIP: ip,
    },
    url: `http://${ip}:3000`,
  };
});

const ComputerControl: React.FC<Screens["ComputerControl"]> = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesComputerControl();

  const [devices, setDevices] = useState<Device[]>(
    REPLACERS.isDev ? devicesDev : [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);

  const scanningRef = useRef(scanning);
  scanningRef.current = scanning;

  const devicesRef = useRef<Device[]>(devices);
  devicesRef.current = devices;

  const zeroconfRef = useRef(new Zeroconf());

  const rescanTimeoutRef = useRef<number | null>(null);
  const rescanPauseTimeoutRef = useRef<number | null>(null);

  const clearRescanTimersRef = useRef(() => {
    Timers.clearTimeout(rescanTimeoutRef.current);
    Timers.clearTimeout(rescanPauseTimeoutRef.current);
  });

  const handleStopRef = useRef(async () => {
    REPLACERS.Logger.log(TAG, "Scan stopped");
    setLoading(false);
    setScanning(false);
  });

  const refreshExistingDevicesRef = useRef(async () => {
    const currentDevices = devicesRef.current;
    if (currentDevices.length === 0) return;

    const results = await Promise.all(
      currentDevices.map(async (device) => {
        const newUrl = REPLACERS.isDev ? device.url : await tryUrls(device);
        return { deviceId: device.deviceId, newUrl, device };
      }),
    );

    const updatesById = new Map(
      results.map((result) => [result.deviceId, result]),
    );
    const previousIds = new Set(currentDevices.map((d) => d.deviceId));

    setDevices((prev) => {
      return prev
        .map((device) => {
          if (!previousIds.has(device.deviceId)) return device;

          const result = updatesById.get(device.deviceId);
          if (!result?.newUrl) return null;

          if (result.newUrl === device.url) return device;

          return { ...device, url: result.newUrl };
        })
        .filter((device): device is Device => !!device);
    });
  });

  const scanNetworkRef = useRef(() => {
    if (scanningRef.current) return;

    refreshExistingDevicesRef.current();
    setLoading(true);
    setScanning(true);

    zeroconfRef.current.scan("http", "tcp", "local.", "DNSSD");
  });

  const startRescanCycleRef = useRef(() => {
    clearRescanTimersRef.current();

    scanNetworkRef.current();

    rescanTimeoutRef.current = Timers.setTimeout(() => {
      zeroconfRef.current.stop("DNSSD");
      rescanPauseTimeoutRef.current = Timers.setTimeout(() => {
        startRescanCycleRef.current();
      }, 1000);
    }, 10000);
  });

  const executeCommandOnDevice = useRef<ExecuteCommandOnDevice>(
    async (baseUrl, deviceId, command) => {
      let success = false;
      try {
        const res = await axios.post<{ success: boolean }>(
          `${baseUrl}/${command}`,
          { deviceId },
          { timeout: 5000 },
        );
        success = res?.data?.success;
      } catch (error) {
        REPLACERS.Logger.error(
          `Error sending "${command}" command to "${baseUrl}":`,
          error instanceof Error ? error.message : String(error),
        );
      }
      let translate: "turnOff" | "restart" = "restart";
      if (command === "turn-off-computer") translate = "turnOff";

      modalRef.openSnackBar?.(
        tTyped(
          success
            ? `terminalCommands.${translate}CommandSent`
            : `terminalCommands.${translate}CommandFailed`,
        ),
        5000,
      );
      if (success) setScanning(true);
    },
  );

  const renderItem = useCallback(({ item }: { item: Device }) => {
    return (
      <ComputerItem
        item={item}
        executeCommandOnDevice={executeCommandOnDevice.current}
      />
    );
  }, []);

  const renderEmpty = useCallback(() => {
    if (scanning && loading)
      return (
        <View style={styles.flexCenter}>
          <ActivityIndicator animating size="large" />
          <Text style={styles.subtitle}>
            {t("computerControl.searchingDevices")}
          </Text>
        </View>
      );

    return (
      <Text style={styles.subtitle}>{t("computerControl.noDevices")}</Text>
    );
  }, [styles.subtitle, t, scanning, loading, styles.flexCenter]);

  const keyExtractor = useCallback((item: Device) => item.name, []);

  useEffect(() => {
    const requestPermissions = async (): Promise<boolean> => {
      try {
        const permissionsToRequest: Permission[] = [];

        if (Number(Platform.Version) >= 33) {
          permissionsToRequest.push(
            PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
          );
        }

        permissionsToRequest.push(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        );

        const granted =
          await PermissionsAndroid.requestMultiple(permissionsToRequest);

        const locationGranted =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED;

        const nearbyGranted =
          Number(Platform.Version) >= 33
            ? granted[PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] ===
              PermissionsAndroid.RESULTS.GRANTED
            : true;

        const isGranted = locationGranted && nearbyGranted;

        if (!isGranted) {
          REPLACERS.Logger.error(
            TAG,
            "Location permissions not granted, cannot scan for devices",
          );
          modalRef.openSnackBar?.(
            tTyped("permissions.locationPermissionMessage"),
            3000,
          );
        }

        return isGranted;
      } catch (err) {
        REPLACERS.Logger.error(
          TAG,
          "Error while requesting permissions",
          err instanceof Error ? err.message : err,
        );
        return false;
      }
    };
    requestPermissions().then((granted) => {
      if (granted) {
        startRescanCycleRef.current();
      } else {
        navigation.replace("Home");
      }
    });

    const handleResolved = async (_: Service) => {
      const service = _ as ServiceAdvertisementTXT;
      if (!service.txt?.deviceId) return;

      const validUrl = await tryUrls(service);
      if (!validUrl) {
        REPLACERS.Logger.error(
          "Could not find a valid service for",
          service.name,
        );
        return;
      }

      setDevices((prev) => {
        const existing = prev.find((d) => d.deviceId === service.txt.deviceId);
        if (existing) {
          if (existing.url === validUrl) return prev;

          return prev.map((device) =>
            device.deviceId === service.txt.deviceId
              ? { ...device, url: validUrl }
              : device,
          );
        }

        setLoading(false);
        return [
          ...prev,
          {
            ...service,
            name: service.name.split(" ")[0],
            url: validUrl,
            deviceId: service.txt.deviceId,
          },
        ];
      });
    };

    zeroconfRef.current.on("stop", handleStopRef.current);
    zeroconfRef.current.on("resolved", handleResolved);
    zeroconfRef.current.on("error", (err) => {
      REPLACERS.Logger.error(TAG, "Zeroconf error:", err?.message ?? err);
      zeroconfRef.current.stop("DNSSD");
    });

    const appStateListener = deviceInfo.addEventListener(
      EventsDeviceInfo.appStateChange,
      (newState) => {
        if (newState === "active" && !scanningRef.current) {
          startRescanCycleRef.current();
        } else if (newState !== "active" && scanningRef.current) {
          clearRescanTimersRef.current();
          zeroconfRef.current.stop("DNSSD");
        }
      },
    );

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      clearRescanTimersRef.current();
      appStateListener.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentZeroconf = zeroconfRef.current;
      currentZeroconf.stop("DNSSD");
      currentZeroconf.removeAllListeners();
      currentZeroconf.removeDeviceListeners();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        {t("computerControl.title")}
      </Text>

      <Animated.FlatList
        data={devices}
        style={styles.scrollViewContainer}
        layout={LinearTransition.duration(300).springify()}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.scrollViewContentContainer}
      />

      <FAB
        animated
        icon={scanning ? "refresh" : "magnify"}
        style={styles.FAB}
        color={colors.primary}
        label={scanning ? t("computerControl.scanning") : t("labels.search")}
        loading={scanning}
        onPress={scanNetworkRef.current}
      />
    </View>
  );
};

export default ComputerControl;
