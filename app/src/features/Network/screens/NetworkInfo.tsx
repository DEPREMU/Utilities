import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Timers } from "@common";
import * as NetInfo from "@react-native-community/netinfo";
import { useLanguage } from "@context/LanguageContext";
import { Button, Text } from "react-native-paper";
import { useStylesNetworkInfo } from "@screens/Network/styles/useStylesNetworkInfo";
import { RefreshControl, ScrollView, View } from "react-native";

type NetworkItem = {
  key: string;
  value: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const humanizeKey = (key: string): string => {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const NetworkInfo: React.FC = () => {
  const { t, language } = useLanguage();
  const { styles } = useStylesNetworkInfo();

  const [networkInfo, setNetworkInfo] = useState<NetInfo.NetInfoState | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNetworkInfoRef = useRef(async () => {
    setIsRefreshing(true);

    try {
      const info = await NetInfo.fetch();
      setNetworkInfo(info);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  });

  useEffect(() => {
    fetchNetworkInfoRef.current();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkInfo(state);
      setLastUpdated(new Date());
    });

    const id = Timers.setInterval(fetchNetworkInfoRef.current, 60000);

    return () => {
      unsubscribe();
      Timers.clearInterval(id);
    };
  }, []);

  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat(language || undefined, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    [language],
  );

  const formatValue = useCallback(
    (value: unknown): string => {
      if (value === null || value === undefined || value === "") {
        return t("common.notAvailable");
      }

      if (typeof value === "boolean") {
        return value ? t("common.yes") : t("common.no");
      }

      if (typeof value === "number") {
        return Number.isFinite(value)
          ? String(value)
          : t("common.notAvailable");
      }

      if (typeof value === "string") {
        return value;
      }

      if (Array.isArray(value)) {
        return value.length > 0
          ? value.map((item) => formatValue(item)).join(", ")
          : t("common.notAvailable");
      }

      return JSON.stringify(value);
    },
    [t],
  );

  const generalInfo = useMemo<NetworkItem[]>(() => {
    if (!networkInfo) return [];

    return [
      { key: "type", value: networkInfo.type },
      { key: "isConnected", value: networkInfo.isConnected },
      { key: "isInternetReachable", value: networkInfo.isInternetReachable },
      { key: "isWifiEnabled", value: networkInfo.isWifiEnabled },
    ];
  }, [networkInfo]);

  const detailInfo = useMemo(() => {
    const details = networkInfo?.details;
    if (!details || !isObject(details)) {
      return { primitives: [] as NetworkItem[], nested: [] as NetworkItem[] };
    }

    const entries = Object.entries(details).filter(([, value]) => {
      return value !== undefined;
    });

    return {
      primitives: entries
        .filter(([, value]) => !isObject(value))
        .map(([key, value]) => ({ key, value })),
      nested: entries
        .filter(([, value]) => isObject(value))
        .map(([key, value]) => ({ key, value })),
    };
  }, [networkInfo]);

  const renderItem = useCallback(
    ({ key, value }: NetworkItem) => {
      return (
        <View key={key} style={styles.keyValueRow}>
          <Text style={styles.textKey}>{humanizeKey(key)}</Text>
          <View style={styles.valueContainer}>
            <Text style={styles.textValue}>{formatValue(value)}</Text>
          </View>
        </View>
      );
    },
    [formatValue, styles],
  );

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return t("common.notAvailable");
    return formatDate.format(lastUpdated);
  }, [formatDate, lastUpdated, t]);

  if (!networkInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("network.networkInfo.title")}</Text>
        <Text style={styles.emptyState}>{t("common.notAvailable")}</Text>
      </View>
    );
  }

  const hasDetails =
    detailInfo.primitives.length > 0 || detailInfo.nested.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("network.networkInfo.title")}</Text>
      <View style={styles.headerActions}>
        <Text style={styles.lastUpdatedText}>
          {t("network.networkInfo.lastUpdated", { time: lastUpdatedText })}
        </Text>
        <Button
          mode="contained"
          onPress={fetchNetworkInfoRef.current}
          loading={isRefreshing}
          disabled={isRefreshing}
          style={styles.refreshButton}
          compact
        >
          {t("network.networkInfo.refresh")}
        </Button>
      </View>
      <ScrollView
        style={styles.containerScrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={fetchNetworkInfoRef.current}
          />
        }
      >
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            {t("network.networkInfo.general")}
          </Text>
          {generalInfo.map(renderItem)}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            {t("network.networkInfo.details")}
          </Text>
          {hasDetails ? detailInfo.primitives.map(renderItem) : null}
          {!hasDetails && (
            <Text style={styles.emptyState}>{t("common.notAvailable")}</Text>
          )}
        </View>

        {detailInfo.nested.map(({ key, value }) => {
          if (!isObject(value)) return null;

          return (
            <View key={key} style={styles.infoCard}>
              <Text style={styles.sectionTitle}>{humanizeKey(key)}</Text>
              {Object.entries(value).map(([nestedKey, nestedValue]) => {
                return renderItem({ key: nestedKey, value: nestedValue });
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default NetworkInfo;
