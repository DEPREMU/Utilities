import { isFalsy } from "@utils";
import { View, Text } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import useStylesIP_API from "@styles/components/connectivity/useStylesIP_API";
import { dataIP_API_JSON, typeLanguages } from "@types";
import React, { memo, useEffect, useMemo, useState } from "react";

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

const keysTranslated: Record<keyof dataIP_API_JSON, keyof typeLanguages> = {
  status: "status",
  continent: "continent",
  continentCode: "continentCode",
  country: "country",
  countryCode: "countryCode",
  region: "region",
  regionName: "regionName",
  city: "city",
  district: "district",
  zip: "zipcode",
  lat: "latitude",
  lon: "longitude",
  timezone: "timezone",
  offset: "utcOffset",
  currency: "currency",
  isp: "isp",
  org: "organization",
  as: "as",
  asname: "asname",
  reverse: "reverse",
  mobile: "isMobile",
  proxy: "isProxy",
  hosting: "isHosting",
  query: "yourIP",
};

const IP_API: React.FC<IP_ApiProps> = ({ data }) => {
  const { t } = useLanguage();
  const { styles } = useStylesIP_API();

  const [show, setShow] = useState<boolean>(true);
  const [dataIP, setDataIP] = useState<dataIP_API_JSON>(dataIPLocal);

  useEffect(() => {
    if (dataIP.status === "success") return;

    const id = setTimeout(() => {
      if (dataIP.status !== "success") setShow(false);
    }, 10000);

    return () => clearTimeout(id);
  }, [dataIP]);

  useEffect(() => {
    if (!data) return;

    const idTimeout = setTimeout(() => {
      setDataIP(data);
    }, 2500);

    return () => clearTimeout(idTimeout);
  }, [data]);

  const renderData = useMemo(
    () =>
      Object.entries(dataIP).map(([key, value]) => {
        const isValueEmpty = isFalsy(value);
        if (key === "query" || isValueEmpty) return null;

        const keyTyped = key as keyof dataIP_API_JSON;
        const valueToShow =
          typeof value === "boolean"
            ? value
              ? t("yes")
              : t("no")
            : String(value);

        return (
          <View key={key} style={styles.containerEachValue}>
            <Text style={styles.textKey}>{t(keysTranslated[keyTyped])}</Text>
            <Text style={styles.value}>{valueToShow || t("notAvailable")}</Text>
          </View>
        );
      }),
    [dataIP, styles, t],
  );

  if (!show) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>IP API</Text>

      <View style={styles.containerIP}>
        <Text style={styles.textKey}>{t("yourIP", { ip: "" })}</Text>
        <Text style={styles.value}>{dataIP?.query}</Text>
      </View>

      <View style={styles.containerDataIP}>{renderData}</View>
    </View>
  );
};

const IP_API_Memo = memo(IP_API, (prevProps, nextProps) => {
  return prevProps.data === nextProps.data;
});

export default IP_API_Memo;
