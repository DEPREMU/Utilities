import {
  memoDeep,
  getFormattedDate,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import {
  IPQueryISP,
  IPQueryRisk,
  dataIPQueryJSON,
  IPQueryLocation,
  AppTranslationsKeys,
  Function,
} from "@types";
import { View, Text } from "react-native";
// import MapView, { Marker } from "react-native-maps";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@/common/components/SkeletonLoading";
import useStylesIPQuery from "@screens/Network/styles/useStylesIPQuery";
import React, { useEffect, useMemo, useState } from "react";

interface IPQueryProps {
  data: dataIPQueryJSON | null;
}

const keysTranslated: Record<
  keyof dataIPQueryJSON,
  | AppTranslationsKeys
  | Record<keyof IPQueryISP, AppTranslationsKeys>
  | Record<keyof IPQueryLocation, AppTranslationsKeys>
  | Record<keyof IPQueryRisk, AppTranslationsKeys>
> = {
  ip: "network.yourIP",
  isp: {
    asn: "network.asn",
    org: "network.organization",
    isp: "network.isp",
  },
  location: {
    country: "network.country",
    country_code: "network.countryCode",
    city: "network.city",
    state: "network.state",
    zipcode: "network.zipcode",
    latitude: "network.latitude",
    longitude: "network.longitude",
    timezone: "network.timezone",
    localtime: "network.localTime",
  },
  risk: {
    is_mobile: "network.isMobile",
    is_vpn: "network.isVPN",
    is_tor: "network.isTOR",
    is_proxy: "network.isProxy",
    is_datacenter: "network.isDatacenter",
    risk_score: "network.riskScore",
  },
};

const IPQuery: React.FC<IPQueryProps> = ({ data }) => {
  const { styles } = useStylesIPQuery();
  const { t } = useLanguage();

  const [show, setShow] = useState<boolean>(true);
  const [dataIP, setDataIP] = useState<dataIPQueryJSON>(
    keysTranslated as unknown as dataIPQueryJSON,
  );

  const renderData = useMemo(() => {
    return Object.entries(dataIP).map(([key, value]) => {
      if (key === "ip" || !value) return null;

      if (typeof value !== "object" || Array.isArray(value)) return null;

      const subEntries = Object.entries(value || {}).filter(
        ([, subValue]) => !!subValue,
      );

      return subEntries.map(([subKey, subValue]) => {
        const translationKey = (
          keysTranslated[key as keyof Omit<dataIPQueryJSON, "ip">] as Record<
            string,
            AppTranslationsKeys
          >
        )[subKey];

        let valueToShow: string = "";
        if (typeof subValue === "boolean")
          valueToShow = subValue ? t("common.yes") : t("common.no");
        else if (
          translationKey === "network.localTime" &&
          String(subValue).includes("T") &&
          String(subValue).includes(":")
        )
          valueToShow = getFormattedDate(new Date(String(subValue)));
        else valueToShow = String(subValue);

        return (
          <View key={`${key}-${subKey}`} style={styles.containerEachValue}>
            <Text style={styles.textKey}>
              {/* eslint-disable-next-line react/jsx-no-literals */}
              {(t as Function<[AppTranslationsKeys], string>)(translationKey)}:
            </Text>
            <SkeletonLoading
              showChildren={dataIP?.ip !== "yourIP"}
              style={styles.skeletonValue}
            >
              <Text style={styles.value}>{valueToShow}</Text>
            </SkeletonLoading>
          </View>
        );
      });
    });
  }, [
    t,
    dataIP,
    styles.value,
    styles.textKey,
    styles.skeletonValue,
    styles.containerEachValue,
  ]);

  useEffect(() => {
    if (dataIP?.ip !== "yourIP") return;

    const id = setTimeoutPolyfill(() => {
      if (dataIP?.ip === "yourIP") setShow(false);
    }, 10000);

    return () => clearTimeoutPolyfill(id);
  }, [dataIP]);

  useEffect(() => {
    if (!data) return;

    const id = setTimeoutPolyfill(() => {
      setDataIP(data);
      setShow(true);
    }, 1500);

    return () => clearTimeoutPolyfill(id);
  }, [data]);

  if (!show) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>{t("iPQuery.title")}</Text>

      <View style={styles.containerIP}>
        <Text style={styles.textKey}>{t("network.yourIP", { ip: "" })}</Text>
        <SkeletonLoading
          showChildren={dataIP?.ip !== "network.yourIP"}
          style={[styles.skeletonValue]}
        >
          <Text style={styles.valueIP}>{dataIP?.ip}</Text>
        </SkeletonLoading>
      </View>

      <View style={styles.containerDataIP}>{renderData}</View>

      {/* Mapa */}
      {/* <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: dataIP.location.latitude,
            longitude: dataIP.location.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          <Marker
            coordinate={{
              latitude: dataIP.location.latitude,
              longitude: dataIP.location.longitude,
            }}
            title="Your Location"
            description={`Lat: ${dataIP.location.latitude}, Lon: ${dataIP.location.longitude}`}
          />
        </MapView>
      </View> */}
    </View>
  );
};

const IPQueryMemo = memoDeep(IPQuery);

export default IPQueryMemo;
