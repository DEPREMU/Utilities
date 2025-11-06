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

const getUrl = (host: string, port: number): string => {
  return `http://${host}:${port}/status`;
};

const tryUrls = async (
  service: ServiceAdvertisementTXT,
): Promise<string | null> => {
  const candidates = [
    getUrl(service.host, service.port),
    getUrl(service.txt.lanIP, service.port),
    getUrl(service.addresses?.[0], service.port),
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      if (await checkUrlStatus(url)) return url.replace("/status", "");
    } catch (error) {
      logError(`Error while fetching ${url}:`, error);
    }
  }
  return null;
};

type ServiceAdvertisementTXT = Service & { txt: AdvertisementTXT };
type Device = ServiceAdvertisementTXT & { url: string; deviceId: string };

const ComputerControl: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesComputerControl();
  const { openSnackBar } = useModal();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);

  const timeOutRef = useRef<NodeJS.Timeout | number | null>(null);

  const turnOffComputer = useCallback(
    async (baseUrl: string, deviceId: string) => {
      let success = false;
      try {
        const res = await axios.post(
          `${baseUrl}/turn-off-computer`,
          { deviceId },
          { timeout: 5000 },
        );
        const data = res.data;
        success = data.success;
      } catch (error) {
        logError(`Error sending turn off command to ${baseUrl}:`, error);
      }
      openSnackBar(
        t(success ? "turnOffCommandSent" : "turnOffCommandFailed"),
        5000,
      );
    },
    [openSnackBar, t],
  );

  const restartComputer = useCallback(
    async (baseUrl: string, deviceId: string) => {
      let success = false;
      try {
        const res = await axios.post(
          `${baseUrl}/restart-computer`,
          { deviceId },
          { timeout: 5000 },
        );
        const data = res.data;
        success = data.success;
      } catch (error) {
        logError(`Error sending restart command to ${baseUrl}:`, error);
      }
      openSnackBar(
        t(success ? "restartCommandSent" : "restartCommandFailed"),
        5000,
      );
    },
    [openSnackBar, t],
  );

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
        if (prev.find((d) => d.name === service.name)) return prev;
        return [
          ...prev,
          {
            ...service,
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
    };

    zeroconf.on("resolved", handleResolved);
    zeroconf.on("error", (err) => {
      logError("Zeroconf error:", err);
      handleStop();
    });
    zeroconf.on("stop", handleStop);

    zeroconf.scan("http", "tcp", "local.");

    if (timeOutRef.current) clearTimeout(timeOutRef.current);
    timeOutRef.current = setTimeout(() => {
      zeroconf.stop();
    }, 30000);

    return () => {
      zeroconf.stop();
      zeroconf.removeDeviceListeners();
      if (timeOutRef.current) clearTimeout(timeOutRef.current);
    };
  }, []);

  useEffect(scanNetwork, [scanNetwork]);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        {t("computerControlTitle")}
      </Text>

      {loading && devices.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} size="large" />
          <Text style={styles.loadingText}>{t("searchingDevices")}</Text>
        </View>
      ) : devices.length > 0 ? (
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
                  onPress={() => turnOffComputer(item.url, item.deviceId)}
                />

                <List.Item
                  title={t("restartComputer")}
                  description={item.url}
                  left={(props) => (
                    <List.Icon {...props} icon="restart" color="#1976d2" />
                  )}
                  onPress={() => restartComputer(item.url, item.deviceId)}
                />
              </List.Section>
            </Card.Content>
          </Card>
        ))
      ) : (
        <Text style={styles.emptyText}>{t("noDevices")}</Text>
      )}

      <FAB
        icon={scanning ? "refresh" : "magnify"}
        label={t(scanning ? "scanning" : "search")}
        onPress={() => !scanning && scanNetwork()}
        style={styles.fab}
        loading={scanning}
      />
    </View>
  );
};

export default ComputerControl;
