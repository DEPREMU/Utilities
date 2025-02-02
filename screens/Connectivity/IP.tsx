import {
  Text,
  View,
  Alert,
  ScrollView,
  BackHandler,
  SafeAreaView,
} from "react-native";
import { styles } from "../../styles/connectivity/stylesIP";
import { dataIPJSON } from "../../utils/globalVariables/interfaces";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { Marker } from "react-native-maps";
import { getDataIP, getIP } from "../../utils/globalVariables/utils";
import React, { useEffect, useState } from "react";

interface IPProps {
  navigation: any;
}

const IP: React.FC<IPProps> = ({ navigation }) => {
  const [ip, setIp] = useState<string | null>(null);
  const [dataIP, setDataIP] = useState<dataIPJSON | null>(null);

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to back to the menu selector?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => navigation.replace("Start"),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  useEffect(() => {
    const getIp = async () => {
      const IP = await getIP();
      setIp(IP);
    };

    getIp();
  }, []);

  useEffect(() => {
    const getDataIp = async () => {
      if (!ip) return;
      const data = await getDataIP(ip);
      setDataIP(data);
    };

    getDataIp();
  }, [ip]);

  return (
    <SafeAreaView style={styles.containerSafeAreaView}>
      <ScrollView
        style={styles.containerScrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.container}>
          <Text style={styles.textIP}>Your IP is: {ip}</Text>
          {dataIP && (
            <>
              <View style={styles.containerDataIP}>
                <Text style={styles.textISP}>ISP: {dataIP.isp.isp}</Text>
                <Text style={styles.textData}>ASN: {dataIP.isp.asn}</Text>
                <Text style={styles.textData}>
                  Organization: {dataIP.isp.org}
                </Text>
                <Text style={styles.textData}>
                  Country: {dataIP.location.country}
                </Text>
                <Text style={styles.textData}>
                  Country Code: {dataIP.location.country_code}
                </Text>
                <Text style={styles.textData}>
                  City: {dataIP.location.city}
                </Text>
                <Text style={styles.textData}>
                  State: {dataIP.location.state}
                </Text>
                <Text style={styles.textData}>
                  Zipcode: {dataIP.location.zipcode}
                </Text>
                <Text style={styles.textData}>
                  Latitude: {dataIP.location.latitude}
                </Text>
                <Text style={styles.textData}>
                  Longitude: {dataIP.location.longitude}
                </Text>
                <Text style={styles.textData}>
                  Timezone: {dataIP.location.timezone}
                </Text>
                <Text style={styles.textData}>
                  Local Time:{" "}
                  {new Date(dataIP.location.localtime).toLocaleString()}
                </Text>
                <Text style={styles.textData}>
                  Is Mobile: {dataIP.risk.is_mobile ? "Yes" : "No"}
                </Text>
                <Text style={styles.textData}>
                  Is VPN: {dataIP.risk.is_vpn ? "Yes" : "No"}
                </Text>
                <Text style={styles.textData}>
                  Is TOR: {dataIP.risk.is_tor ? "Yes" : "No"}
                </Text>
                <Text style={styles.textData}>
                  Is Proxy: {dataIP.risk.is_proxy ? "Yes" : "No"}
                </Text>
                <Text style={styles.textData}>
                  Is Datacenter: {dataIP.risk.is_datacenter ? "Yes" : "No"}
                </Text>
                <Text style={styles.textData}>
                  Risk Score: {dataIP.risk.risk_score}
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
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default IP;
