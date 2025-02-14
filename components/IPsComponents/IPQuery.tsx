import React from "react";
import { View, Text, LogBox } from "react-native";
import { stylesIPQuery } from "../../styles/stylesIPs/stylesIPQuery";
import { dataIPQueryJSON } from "../../utils/globalVariables/interfaces";
// import MapView, { Marker } from "react-native-maps";
LogBox.ignoreAllLogs(false);

type IPQueryProps = {
  dataIPBefore: string;
};

const IPQuery: React.FC<IPQueryProps> = ({ dataIPBefore }) => {
  const styles = stylesIPQuery();

  const dataIP: dataIPQueryJSON = JSON.parse(dataIPBefore);
  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>IP Query</Text>
      <Text style={styles.textIP}>
        Your IP is: <Text style={styles.valueIP}>{dataIP.ip}</Text>
      </Text>

      <View style={styles.containerDataIP}>
        <Text style={styles.textKey}>
          ISP: <Text style={styles.value}>{dataIP.isp.isp}</Text>
        </Text>
        <Text style={styles.textKey}>
          ASN: <Text style={styles.value}>{dataIP.isp.asn}</Text>
        </Text>
        <Text style={styles.textKey}>
          Organization: <Text style={styles.value}>{dataIP.isp.org}</Text>
        </Text>
        <Text style={styles.textKey}>
          Country: <Text style={styles.value}>{dataIP.location.country}</Text>
        </Text>
        <Text style={styles.textKey}>
          Country Code:{" "}
          <Text style={styles.value}>{dataIP.location.country_code}</Text>
        </Text>
        <Text style={styles.textKey}>
          City: <Text style={styles.value}>{dataIP.location.city}</Text>
        </Text>
        <Text style={styles.textKey}>
          State: <Text style={styles.value}>{dataIP.location.state}</Text>
        </Text>
        <Text style={styles.textKey}>
          Zipcode: <Text style={styles.value}>{dataIP.location.zipcode}</Text>
        </Text>
        <Text style={styles.textKey}>
          Latitude: <Text style={styles.value}>{dataIP.location.latitude}</Text>
        </Text>
        <Text style={styles.textKey}>
          Longitude:{" "}
          <Text style={styles.value}>{dataIP.location.longitude}</Text>
        </Text>
        <Text style={styles.textKey}>
          Timezone: <Text style={styles.value}>{dataIP.location.timezone}</Text>
        </Text>
        <Text style={styles.textKey}>
          Local Time:{" "}
          <Text style={styles.value}>
            {new Date(dataIP.location.localtime).toLocaleString()}
          </Text>
        </Text>
        <Text style={styles.textKey}>
          Is Mobile:{" "}
          <Text style={styles.value}>
            {dataIP.risk.is_mobile ? "Yes" : "No"}
          </Text>
        </Text>
        <Text style={styles.textKey}>
          Is VPN:{" "}
          <Text style={styles.value}>{dataIP.risk.is_vpn ? "Yes" : "No"}</Text>
        </Text>
        <Text style={styles.textKey}>
          Is TOR:{" "}
          <Text style={styles.value}>{dataIP.risk.is_tor ? "Yes" : "No"}</Text>
        </Text>
        <Text style={styles.textKey}>
          Is Proxy:{" "}
          <Text style={styles.value}>
            {dataIP.risk.is_proxy ? "Yes" : "No"}
          </Text>
        </Text>
        <Text style={styles.textKey}>
          Is Datacenter:{" "}
          <Text style={styles.value}>
            {dataIP.risk.is_datacenter ? "Yes" : "No"}
          </Text>
        </Text>
        <Text style={styles.textKey}>
          Risk Score: <Text style={styles.value}>{dataIP.risk.risk_score}</Text>
        </Text>
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
