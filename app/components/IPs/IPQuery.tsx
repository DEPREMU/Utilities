import React from "react";
import { View, Text } from "react-native";
import {
  dataIPQueryJSON,
  IPQueryISP,
  IPQueryLocation,
  IPQueryRisk,
  typeLanguages,
} from "@types";
// import MapView, { Marker } from "react-native-maps";
import useStylesIPQuery from "@styles/components/connectivity/useStylesIPQuery";
import { useLanguage } from "@/context/LanguageContext";

interface IPQueryProps {
  dataIP: dataIPQueryJSON;
}

const keysTranslated: Record<
  keyof dataIPQueryJSON,
  | keyof typeLanguages
  | Record<keyof IPQueryISP, keyof typeLanguages>
  | Record<keyof IPQueryLocation, keyof typeLanguages>
  | Record<keyof IPQueryRisk, keyof typeLanguages>
> = {
  ip: "yourIP",
  isp: {
    asn: "asn",
    org: "organization",
    isp: "isp",
  },
  location: {
    country: "country",
    country_code: "countryCode",
    city: "city",
    state: "state",
    zipcode: "zipcode",
    latitude: "latitude",
    longitude: "longitude",
    timezone: "timezone",
    localtime: "localTime",
  },
  risk: {
    is_mobile: "isMobile",
    is_vpn: "isVPN",
    is_tor: "isTOR",
    is_proxy: "isProxy",
    is_datacenter: "isDatacenter",
    risk_score: "riskScore",
  },
};

const IPQuery: React.FC<IPQueryProps> = ({ dataIP }) => {
  const { styles } = useStylesIPQuery();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>IP Query</Text>
      <Text style={styles.textIP}>
        {t("yourIP", { ip: "" })}
        <Text style={styles.valueIP}>{dataIP.ip}</Text>
      </Text>

      <View style={styles.containerDataIP}>
        {Object.entries(dataIP).map(([key, value]) => {
          if (key === "ip" || !value) return null;

          const keyTyped = key as keyof Omit<dataIPQueryJSON, "ip">;

          if (typeof value === "object" && !Array.isArray(value)) {
            return (
              <View key={key}>
                {Object.entries(value).map(([subKey, subValue]) => {
                  if (
                    subValue === "" ||
                    subValue === null ||
                    subValue === undefined
                  )
                    return null;

                  const translationKey = (
                    keysTranslated[keyTyped] as Record<
                      string,
                      keyof typeLanguages
                    >
                  )[subKey];

                  let valueToShow: string = "";
                  if (typeof subValue === "boolean") {
                    valueToShow = subValue ? t("yes") : t("no");
                  } else {
                    valueToShow = String(subValue);
                  }

                  return (
                    <Text style={styles.textKey} key={`${key}-${subKey}`}>
                      {t(translationKey)}:{" "}
                      <Text style={styles.value}>{valueToShow}</Text>
                    </Text>
                  );
                })}
              </View>
            );
          }

          return null;
        })}
      </View>

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

export default IPQuery;
