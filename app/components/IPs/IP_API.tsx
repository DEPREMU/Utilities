import React from "react";
import { View, Text } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import useStylesIP_API from "@styles/components/connectivity/useStylesIP_API";
import { dataIP_APIJSON, typeLanguages } from "@types";
// import MapView, { Marker } from "react-native-maps";

interface IP_ApiProps {
  dataIP: dataIP_APIJSON;
}

const keysTranslated: Record<keyof dataIP_APIJSON, keyof typeLanguages> = {
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

const IP_API: React.FC<IP_ApiProps> = ({ dataIP }) => {
  const { styles } = useStylesIP_API();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>IP API</Text>
      <Text style={styles.textIP}>
        {t("yourIP", { ip: "" })}:{" "}
        <Text style={styles.value}>{dataIP.query}</Text>
      </Text>

      <View style={styles.containerDataIP}>
        {Object.entries(dataIP).map(([key, value]) => {
          const isValueEmpty = value === "" || value === null;
          if (key === "query" || isValueEmpty) return null;

          const keyTyped = key as keyof dataIP_APIJSON;
          let valueToShow: string = "";
          if (typeof value !== "boolean") valueToShow = String(value);
          else valueToShow = value ? t("yes") : t("no");

          return (
            <Text style={styles.textKey} key={key}>
              {t(keysTranslated[keyTyped])}:{" "}
              <Text style={styles.value}>
                {valueToShow || t("notAvailable")}
              </Text>
            </Text>
          );
        })}
      </View>

      {/* Map */}
      {/* <View style={styles.mapContainer}>
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: dataIP.lat,
          </Text>;
        })}
      </View>

      {/* Map */}
      {/* <View style={styles.mapContainer}>
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: dataIP.lat,
        longitude: dataIP.lon,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
    >
      <Marker
        coordinate={{
          latitude: dataIP.lat,
          longitude: dataIP.lon,
        }}
        title="Your Location"
        description={`Lat: ${dataIP.lat}, Lon: ${dataIP.lon}`}
      />
    </MapView>
  </View> */}
    </View>
  );
};

export default IP_API;
