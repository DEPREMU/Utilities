import {
  logger,
  tTyped,
  deviceInfo,
  navigation,
  checkUrlStatus,
  EventsDeviceInfo,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import axios from "axios";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { AdvertisementTXT } from "@types";
import Zeroconf, { Service } from "react-native-zeroconf";
import useStylesComputerControl from "@screens/Phone/ComputesControl/styles/useStylesComputerControl";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Card, List, Text, FAB } from "react-native-paper";
// eslint-disable-next-line react-native/split-platform-components
import { View, PermissionsAndroid, Platform, Permission } from "react-native";

type Device = ServiceAdvertisementTXT & { url: string; deviceId: string };
type ServiceAdvertisementTXT = Service & { txt: AdvertisementTXT };

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
    const id = setTimeoutPolyfill(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 5000);

    candidates.forEach(async (url) => {
      try {
        if (await checkUrlStatus(url, "get", 2000)) {
          if (!resolved) {
            resolved = true;
            clearTimeoutPolyfill(id);
            resolve(url.replace("/status", ""));
          }
        }
      } catch (error) {
        logger.error(
          "COMPUTER CONTROL",
          `Error while fetching ${url}:`,
          (error as Error).message,
        );
      }
    });
  });
};

const ComputerControl: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesComputerControl();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);

  const scanningRef = useRef(scanning);
  scanningRef.current = scanning;

  const devicesRef = useRef<Device[]>([]);
  devicesRef.current = devices;

  const zeroconfRef = useRef(new Zeroconf());

  const rescanTimeoutRef = useRef<number | null>(null);
  const rescanPauseTimeoutRef = useRef<number | null>(null);

  const clearRescanTimersRef = useRef(() => {
    clearTimeoutPolyfill(rescanTimeoutRef);
    clearTimeoutPolyfill(rescanPauseTimeoutRef);
  });

  const handleStopRef = useRef(async () => {
    logger.log("COMPUTER CONTROL", "Scan stopped");
    setLoading(false);
    setScanning(false);
  });

  const refreshExistingDevicesRef = useRef(async () => {
    const currentDevices = devicesRef.current;
    if (currentDevices.length === 0) return;

    const results = await Promise.all(
      currentDevices.map(async (device) => {
        const newUrl = await tryUrls(device);
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

    rescanTimeoutRef.current = setTimeoutPolyfill(() => {
      zeroconfRef.current.stop("DNSSD");
      rescanPauseTimeoutRef.current = setTimeoutPolyfill(() => {
        startRescanCycleRef.current();
      }, 1000);
    }, 10000);
  });

  const executeCommandOnDevice = useRef(
    async (
      baseUrl: string,
      deviceId: string,
      command: "turn-off-computer" | "restart-computer",
    ) => {
      let success = false;
      try {
        const res = await axios.post<{ success: boolean }>(
          `${baseUrl}/${command}`,
          { deviceId },
          { timeout: 5000 },
        );
        success = res?.data?.success;
      } catch (error) {
        logger.error(`Error sending ${command} command to ${baseUrl}:`, error);
      }
      let translate: "turnOff" | "restart" = "restart";
      if (command === "turn-off-computer") translate = "turnOff";

      modalRef.openSnackBar?.(
        tTyped(
          success ? `${translate}CommandSent` : `${translate}CommandFailed`,
        ),
        5000,
      );
      if (success) setScanning(true);
    },
  );

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
          logger.error(
            "COMPUTER CONTROL",
            "Location permissions not granted, cannot scan for devices",
          );
          modalRef.openSnackBar?.(tTyped("locationPermissionMessage"), 3000);
        }

        return isGranted;
      } catch (err) {
        logger.error(
          "COMPUTER CONTROL",
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
        logger.error("Could not find a valid service for", service.name);
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
      logger.error("COMPUTER CONTROL", "Zeroconf error:", err);
      zeroconfRef.current.stop("DNSSD");
    });

    const removeListener = deviceInfo.addEventListener(
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
      removeListener();
      zeroconfRef.current.stop("DNSSD");
      // eslint-disable-next-line react-hooks/exhaustive-deps
      zeroconfRef.current.removeDeviceListeners();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        {t("computerControlTitle")}
      </Text>

      {scanning && loading && devices.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" />
          <Text style={styles.loadingText}>{t("searchingDevices")}</Text>
        </View>
      )}

      {!loading &&
        devices.length > 0 &&
        devices.map((item) => (
          <Card key={item.name} style={styles.deviceCard}>
            <Card.Content>
              <List.Section>
                <List.Item
                  title={item.name}
                  description={item.url}
                  left={(props) => (
                    <List.Icon {...props} icon="remote-desktop" />
                  )}
                />

                <List.Item
                  title={t("turnOffComputer")}
                  description={item.url}
                  left={(props) => (
                    <List.Icon {...props} icon="power" color="#d32f2f" />
                  )}
                  onPress={() =>
                    executeCommandOnDevice.current(
                      item.url,
                      item.deviceId,
                      "turn-off-computer",
                    )
                  }
                />

                <List.Item
                  title={t("restartComputer")}
                  description={item.url}
                  left={(props) => (
                    <List.Icon {...props} icon="restart" color="#1976d2" />
                  )}
                  onPress={() =>
                    executeCommandOnDevice.current(
                      item.url,
                      item.deviceId,
                      "restart-computer",
                    )
                  }
                />
              </List.Section>
            </Card.Content>
          </Card>
        ))}

      {!loading && devices.length === 0 && (
        <Text style={styles.emptyText}>{t("noDevices")}</Text>
      )}

      <FAB
        icon={scanning ? "refresh" : "magnify"}
        style={styles.fab}
        label={t(scanning ? "scanning" : "search")}
        loading={scanning}
        onPress={scanNetworkRef.current}
      />
    </View>
  );
};

export default ComputerControl;
