import axios from "axios";
import { View } from "react-native";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { checkUrlStatus, log, logError } from "@utils";
import { AdvertisementTXT } from "@types";
import Zeroconf, { Service } from "react-native-zeroconf";
import useStylesComputerControl from "@styles/screens/ComputerControl/useStylesComputerControl";
import { ActivityIndicator, Card, List, Text, FAB } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

type ServiceAdvertisementTXT = Service & { txt: AdvertisementTXT };
type Device = ServiceAdvertisementTXT & { url: string; deviceId: string };

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
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  return await new Promise((resolve: (value: string | null) => void) => {
    candidates.forEach(async (url) => {
      try {
        if (await checkUrlStatus(url, "get", 2000))
          resolve(url.replace("/status", ""));
      } catch (error) {
        logError(`Error while fetching ${url}:`, error);
      }
    });
  });
};

const ComputerControl: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesComputerControl();
  const { openSnackBar } = useModal();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(true);

  const timeOutRef = useRef<NodeJS.Timeout | number | null>(null);

  const scanNetwork = useCallback(() => {
    const zeroconf = new Zeroconf();
    setDevices([]);
    setLoading(true);
    setScanning(true);

    const handleResolved = async (_: Service) => {
      const service = _ as ServiceAdvertisementTXT;
      if (!service.txt?.deviceId) return;

      const validUrl = await tryUrls(service);
      if (!validUrl) {
        logError(
          "Could not find a valid service for",
          new Error("Could not find a valid service."),
        );
        return;
      }

      setDevices((prev) => {
        if (
          prev.find((d) => {
            return (
              d.name.match(/\d+\.\d+\.\d+\.\d+/)?.[0] ===
              service.name.match(/\d+\.\d+\.\d+\.\d+/)?.[0]
            );
          })
        )
          return prev;
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

    const handleStop = () => {
      log("Scan stopped");
      setLoading(false);
      setScanning(false);
      zeroconf.removeDeviceListeners();
      zeroconf.stop?.();
      if (timeOutRef.current) clearTimeout(timeOutRef.current);
      timeOutRef.current = null;
    };

    zeroconf.on("resolved", handleResolved);
    zeroconf.on("error", (err) => {
      logError("Zeroconf error:", err);
      handleStop();
    });
    zeroconf.on("stop", handleStop);

    zeroconf.scan("http", "tcp", "local.");

    if (timeOutRef.current) clearTimeout(timeOutRef.current);
    timeOutRef.current = setTimeout(handleStop, 30000);

    return () => handleStop();
  }, []);

  const executeCommandOnDevice = useCallback(
    async (
      baseUrl: string,
      deviceId: string,
      command: "turn-off-computer" | "restart-computer",
    ) => {
      let success = false;
      try {
        const res = await axios.post(
          `${baseUrl}/${command}`,
          { deviceId },
          { timeout: 5000 },
        );
        const data = res.data;
        success = data.success;
      } catch (error) {
        logError(`Error sending ${command} command to ${baseUrl}:`, error);
      }
      let translate: "turnOff" | "restart" = "restart";
      if (command === "turn-off-computer") translate = "turnOff";

      openSnackBar(
        t(success ? `${translate}CommandSent` : `${translate}CommandFailed`),
        5000,
      );
      if (success) setScanning(true);
    },
    [openSnackBar, t],
  );

  useEffect(() => {
    if (!scanning) return;

    return scanNetwork();
  }, [scanNetwork, scanning]);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        {t("computerControlTitle")}
      </Text>

      {scanning && loading && devices.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} size="large" />
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
                    executeCommandOnDevice(
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
                    executeCommandOnDevice(
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
        label={t(scanning ? "scanning" : "search")}
        onPress={() => !scanning && setScanning(true)}
        style={styles.fab}
        loading={scanning}
      />
    </View>
  );
};

export default ComputerControl;
