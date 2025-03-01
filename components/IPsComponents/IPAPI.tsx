import { View, Text } from "react-native";
import { stylesIPAPI } from "../../styles/stylesIPs/stylesIPAPI";
import { dataIP_APIJSON } from "../../utils/globalVariables/interfaces";
import React, { useEffect, useState } from "react";
// import MapView, { Marker } from "react-native-maps";

interface IPAPIProps {
  dataIPBefore: string;
}

const IPAPI: React.FC<IPAPIProps> = ({ dataIPBefore }) => {
  const styles = stylesIPAPI();
  const [dataIP, setDataIP] = useState<dataIP_APIJSON | null>(null);

  useEffect(() => {
    if (!dataIPBefore) return;
    setDataIP(JSON.parse(dataIPBefore));
  }, [dataIPBefore]);

  if (!dataIP || dataIP.status !== "success") return null;

  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>IP API</Text>
      {dataIP && dataIP.query != "" && (
        <Text style={styles.textIP}>
          Your IP is: <Text style={styles.value}>{dataIP.query}</Text>
        </Text>
      )}

      <View style={styles.containerDataIP}>
        {dataIP && dataIP.isp != "" && (
          <Text style={styles.textKey}>
            ISP: <Text style={styles.value}>{dataIP.isp}</Text>
          </Text>
        )}
        {dataIP && dataIP.org != "" && (
          <Text style={styles.textKey}>
            Organization: <Text style={styles.value}>{dataIP.org}</Text>
          </Text>
        )}
        {dataIP && dataIP.as != "" && (
          <Text style={styles.textKey}>
            AS: <Text style={styles.value}>{dataIP.as}</Text>
          </Text>
        )}
        {dataIP && dataIP.asname != "" && (
          <Text style={styles.textKey}>
            AS Name: <Text style={styles.value}>{dataIP.asname}</Text>
          </Text>
        )}
        {dataIP && dataIP.reverse != "" && (
          <Text style={styles.textKey}>
            Reverse DNS: <Text style={styles.value}>{dataIP.reverse}</Text>
          </Text>
        )}
        {dataIP && dataIP.continent != "" && (
          <Text style={styles.textKey}>
            Continent: <Text style={styles.value}>{dataIP.continent}</Text>
          </Text>
        )}
        {dataIP && dataIP.continentCode != "" && (
          <Text style={styles.textKey}>
            Continent Code:{" "}
            <Text style={styles.value}>{dataIP.continentCode}</Text>
          </Text>
        )}
        {dataIP && dataIP.country != "" && (
          <Text style={styles.textKey}>
            Country: <Text style={styles.value}>{dataIP.country}</Text>
          </Text>
        )}
        {dataIP && dataIP.countryCode != "" && (
          <Text style={styles.textKey}>
            Country Code: <Text style={styles.value}>{dataIP.countryCode}</Text>
          </Text>
        )}
        {dataIP && dataIP.region != "" && (
          <Text style={styles.textKey}>
            Region: <Text style={styles.value}>{dataIP.region}</Text>
          </Text>
        )}
        {dataIP && dataIP.regionName != "" && (
          <Text style={styles.textKey}>
            Region Name: <Text style={styles.value}>{dataIP.regionName}</Text>
          </Text>
        )}
        {dataIP && dataIP.city != "" && (
          <Text style={styles.textKey}>
            City: <Text style={styles.value}>{dataIP.city}</Text>
          </Text>
        )}
        {dataIP && dataIP.district != "" && (
          <Text style={styles.textKey}>
            District: <Text style={styles.value}>{dataIP.district}</Text>
          </Text>
        )}
        {dataIP && dataIP.zip != "" && (
          <Text style={styles.textKey}>
            Zip: <Text style={styles.value}>{dataIP.zip}</Text>
          </Text>
        )}
        {dataIP && dataIP.lat && (
          <Text style={styles.textKey}>
            Latitude: <Text style={styles.value}>{dataIP.lat}</Text>
          </Text>
        )}
        {dataIP && dataIP.lon && (
          <Text style={styles.textKey}>
            Longitude: <Text style={styles.value}>{dataIP.lon}</Text>
          </Text>
        )}
        {dataIP && dataIP.timezone != "" && (
          <Text style={styles.textKey}>
            Timezone: <Text style={styles.value}>{dataIP.timezone}</Text>
          </Text>
        )}
        {dataIP && dataIP.offset && (
          <Text style={styles.textKey}>
            UTC Offset: <Text style={styles.value}>{dataIP.offset}</Text>
          </Text>
        )}
        {dataIP && dataIP.currency != "" && (
          <Text style={styles.textKey}>
            Currency: <Text style={styles.value}>{dataIP.currency}</Text>
          </Text>
        )}
        {dataIP && dataIP.mobile !== undefined && (
          <Text style={styles.textKey}>
            Mobile:{" "}
            <Text style={styles.value}>{dataIP.mobile ? "Yes" : "No"}</Text>
          </Text>
        )}
        {dataIP && dataIP.proxy !== undefined && (
          <Text style={styles.textKey}>
            Proxy:{" "}
            <Text style={styles.value}>{dataIP.proxy ? "Yes" : "No"}</Text>
          </Text>
        )}
        {dataIP && dataIP.hosting !== undefined && (
          <Text style={styles.textKey}>
            Hosting:{" "}
            <Text style={styles.value}>{dataIP.hosting ? "Yes" : "No"}</Text>
          </Text>
        )}
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

export default IPAPI;
