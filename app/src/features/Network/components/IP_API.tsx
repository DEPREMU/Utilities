import { Timers } from "@common";
import { memoDeep } from "@utils";
import { View, Text } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import useStylesIP_API from "@screens/Network/styles/useStylesIP_API";
import React, { useEffect, useMemo, useState } from "react";
import { dataIP_API_JSON, AppTranslationsKeys } from "@types";

const dataIPLocal: dataIP_API_JSON = {
  status: "false",
  continent: "North America",
  continentCode: "NA",
  country: "United States",
  countryCode: "US",
  region: "California",
  regionName: "California",
  city: "Los Angeles",
  district: "Los Angeles County",
  zip: "90001",
  lat: 34.0522,
  lon: -118.2437,
  timezone: "America/Los_Angeles",
  offset: -8,
  currency: "USD",
  isp: "Your ISP",
  org: "Your Organization",
  as: "AS12345",
  asname: "Your AS Name",
  reverse: "your.reverse.ip",
  mobile: false,
  proxy: false,
  hosting: false,
  query: "192.168.1.1",
};

interface IP_ApiProps {
  data: dataIP_API_JSON | null;
}

const keysTranslated: Record<keyof dataIP_API_JSON, AppTranslationsKeys> = {
  status: "network.status",
  continent: "network.continent",
  continentCode: "network.continentCode",
  country: "network.country",
  countryCode: "network.countryCode",
  region: "network.region",
  regionName: "network.regionName",
  city: "network.city",
  district: "network.district",
  zip: "network.zipcode",
  lat: "network.latitude",
  lon: "network.longitude",
  timezone: "network.timezone",
  offset: "network.utcOffset",
  currency: "network.currency",
  isp: "network.isp",
  org: "network.organization",
  as: "network.as",
  asname: "network.asname",
  reverse: "network.reverseDNS",
  mobile: "network.isMobile",
  proxy: "network.isProxy",
  hosting: "network.isHosting",
  query: "network.yourIP",
};

const IP_API: React.FC<IP_ApiProps> = ({ data }) => {
  const { styles } = useStylesIP_API();
  const { t, dynamicT } = useLanguage();

  const [show, setShow] = useState<boolean>(true);
  const [dataIP, setDataIP] = useState<dataIP_API_JSON>(dataIPLocal);

  useEffect(() => {
    if (dataIP.status === "success") return;

    const id = Timers.setTimeout(() => {
      if (dataIP.status !== "success") setShow(false);
    }, 10000);

    return () => Timers.clearTimeout(id);
  }, [dataIP]);

  useEffect(() => {
    if (!data) return;

    const idTimeout = Timers.setTimeout(() => setDataIP(data), 2500);

    return () => Timers.clearTimeout(idTimeout);
  }, [data]);

  const renderData = useMemo(
    () =>
      Object.entries(dataIP).map(([key, value]) => {
        const isValueEmpty = !value;
        if (key === "query" || isValueEmpty) return null;

        const keyTyped = key as keyof dataIP_API_JSON;
        const valueToShow =
          typeof value === "boolean"
            ? value
              ? t("common.yes")
              : t("common.no")
            : String(value);

        return (
          <View key={key} style={styles.containerEachValue}>
            <Text style={styles.textKey}>
              {dynamicT(keysTranslated[keyTyped])}
            </Text>
            <Text style={styles.value}>
              {valueToShow || t("common.notAvailable")}
            </Text>
          </View>
        );
      }),
    [dataIP, styles, t, dynamicT],
  );

  if (!show) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>{t("iP_API.title")}</Text>

      <View style={styles.containerIP}>
        <Text style={styles.textKey}>{t("network.yourIP", { ip: "" })}</Text>
        <Text style={styles.value}>{dataIP?.query}</Text>
      </View>

      <View style={styles.containerDataIP}>{renderData}</View>
    </View>
  );
};

const IP_API_Memo = memoDeep(IP_API);

export default IP_API_Memo;
