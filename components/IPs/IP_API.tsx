import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { dataIP_APIJSON } from "../../utils/globalVariables/interfaces";
import MapView, { Marker } from "react-native-maps";

interface IP_ApiProps {
  dataIP: dataIP_APIJSON;
}

const IP_API: React.FC<IP_ApiProps> = ({ dataIP }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.textIP}>IP API</Text>
      <Text style={styles.textIP}>
        Your IP is: <Text style={styles.value}>{dataIP.query}</Text>
      </Text>

      <View style={styles.containerDataIP}>
        <Text style={styles.textKey}>
          ISP: <Text style={styles.value}>{dataIP.isp}</Text>
        </Text>
        <Text style={styles.textKey}>
          Organization: <Text style={styles.value}>{dataIP.org}</Text>
        </Text>
        <Text style={styles.textKey}>
          AS: <Text style={styles.value}>{dataIP.as}</Text>
        </Text>
        <Text style={styles.textKey}>
          AS Name: <Text style={styles.value}>{dataIP.asname}</Text>
        </Text>
        <Text style={styles.textKey}>
          Reverse DNS: <Text style={styles.value}>{dataIP.reverse}</Text>
        </Text>
        <Text style={styles.textKey}>
          Continent: <Text style={styles.value}>{dataIP.continent}</Text>
        </Text>
        <Text style={styles.textKey}>
          Continent Code:{" "}
          <Text style={styles.value}>{dataIP.continentCode}</Text>
        </Text>
        <Text style={styles.textKey}>
          Country: <Text style={styles.value}>{dataIP.country}</Text>
        </Text>
        <Text style={styles.textKey}>
          Country Code: <Text style={styles.value}>{dataIP.countryCode}</Text>
        </Text>
        <Text style={styles.textKey}>
          Region: <Text style={styles.value}>{dataIP.region}</Text>
        </Text>
        <Text style={styles.textKey}>
          Region Name: <Text style={styles.value}>{dataIP.regionName}</Text>
        </Text>
        <Text style={styles.textKey}>
          City: <Text style={styles.value}>{dataIP.city}</Text>
        </Text>
        <Text style={styles.textKey}>
          District: <Text style={styles.value}>{dataIP.district}</Text>
        </Text>
        <Text style={styles.textKey}>
          Zip: <Text style={styles.value}>{dataIP.zip}</Text>
        </Text>
        <Text style={styles.textKey}>
          Latitude: <Text style={styles.value}>{dataIP.lat}</Text>
        </Text>
        <Text style={styles.textKey}>
          Longitude: <Text style={styles.value}>{dataIP.lon}</Text>
        </Text>
        <Text style={styles.textKey}>
          Timezone: <Text style={styles.value}>{dataIP.timezone}</Text>
        </Text>
        <Text style={styles.textKey}>
          UTC Offset: <Text style={styles.value}>{dataIP.offset}</Text>
        </Text>
        <Text style={styles.textKey}>
          Currency: <Text style={styles.value}>{dataIP.currency}</Text>
        </Text>
        <Text style={styles.textKey}>
          Mobile:{" "}
          <Text style={styles.value}>{dataIP.mobile ? "Yes" : "No"}</Text>
        </Text>
        <Text style={styles.textKey}>
          Proxy: <Text style={styles.value}>{dataIP.proxy ? "Yes" : "No"}</Text>
        </Text>
        <Text style={styles.textKey}>
          Hosting:{" "}
          <Text style={styles.value}>{dataIP.hosting ? "Yes" : "No"}</Text>
        </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    width: "95%",
    backgroundColor: "#f5f5f5",
  },
  textIP: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  value: {
    fontSize: 18,
    color: "#007BFF",
  },
  containerDataIP: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  textKey: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  mapContainer: {
    height: 200,
    marginTop: 20,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default IP_API;
