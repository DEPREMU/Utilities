import { View, Text } from "react-native";
import { stylesIPQuery } from "../../styles/stylesIPs/stylesIPQuery";
import { dataIPQueryJSON } from "../../utils/globalVariables/interfaces";
import React, { useEffect, useState } from "react";
// import MapView, { Marker } from "react-native-maps";

interface IPQueryProps {
  dataIPBefore: string;
}

const IPQuery: React.FC<IPQueryProps> = ({ dataIPBefore }) => {
  const stylesIPQ = stylesIPQuery();
  const [dataIP, setDataIP] = useState<dataIPQueryJSON | null>(null);

  useEffect(() => {
    if (!dataIPBefore) return;
    setDataIP(JSON.parse(dataIPBefore));
  }, [dataIPBefore]);

  if (!dataIP) return null;
  return (
    <View style={stylesIPQ.container}>
      <Text style={stylesIPQ.textIP}>IP Query</Text>
      <Text style={stylesIPQ.textIP}>
        Your IP is: <Text style={stylesIPQ.valueIP}>{dataIP.ip}</Text>
      </Text>

      <View style={stylesIPQ.containerDataIP}>
        {dataIP.isp && dataIP.isp.isp != "" && (
          <Text style={stylesIPQ.textKey}>
            ISP: <Text style={stylesIPQ.value}>{dataIP.isp.isp}</Text>
          </Text>
        )}
        {dataIP.isp && dataIP.isp.asn != "" && (
          <Text style={stylesIPQ.textKey}>
            ASN: <Text style={stylesIPQ.value}>{dataIP.isp.asn}</Text>
          </Text>
        )}
        {dataIP.isp && dataIP.isp.org != "" && (
          <Text style={stylesIPQ.textKey}>
            Organization: <Text style={stylesIPQ.value}>{dataIP.isp.org}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.country != "" && (
          <Text style={stylesIPQ.textKey}>
            Country:{" "}
            <Text style={stylesIPQ.value}>{dataIP.location.country}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.country_code != "" && (
          <Text style={stylesIPQ.textKey}>
            Country Code:{" "}
            <Text style={stylesIPQ.value}>{dataIP.location.country_code}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.city != "" && (
          <Text style={stylesIPQ.textKey}>
            City: <Text style={stylesIPQ.value}>{dataIP.location.city}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.state != "" && (
          <Text style={stylesIPQ.textKey}>
            State: <Text style={stylesIPQ.value}>{dataIP.location.state}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.zipcode != "" && (
          <Text style={stylesIPQ.textKey}>
            Zipcode:{" "}
            <Text style={stylesIPQ.value}>{dataIP.location.zipcode}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.latitude != undefined && (
          <Text style={stylesIPQ.textKey}>
            Latitude:{" "}
            <Text style={stylesIPQ.value}>{dataIP.location.latitude}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.longitude != undefined && (
          <Text style={stylesIPQ.textKey}>
            Longitude:{" "}
            <Text style={stylesIPQ.value}>{dataIP.location.longitude}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.timezone != "" && (
          <Text style={stylesIPQ.textKey}>
            Timezone:{" "}
            <Text style={stylesIPQ.value}>{dataIP.location.timezone}</Text>
          </Text>
        )}
        {dataIP.location && dataIP.location.localtime != "" && (
          <Text style={stylesIPQ.textKey}>
            Local Time:{" "}
            <Text style={stylesIPQ.value}>
              {new Date(dataIP.location.localtime).toLocaleString()}
            </Text>
          </Text>
        )}
        {dataIP.risk && dataIP.risk.is_mobile !== undefined && (
          <Text style={stylesIPQ.textKey}>
            Is Mobile:{" "}
            <Text style={stylesIPQ.value}>
              {dataIP.risk.is_mobile ? "Yes" : "No"}
            </Text>
          </Text>
        )}
        {dataIP.risk && dataIP.risk.is_vpn !== undefined && (
          <Text style={stylesIPQ.textKey}>
            Is VPN:{" "}
            <Text style={stylesIPQ.value}>
              {dataIP.risk.is_vpn ? "Yes" : "No"}
            </Text>
          </Text>
        )}
        {dataIP.risk && dataIP.risk.is_tor !== undefined && (
          <Text style={stylesIPQ.textKey}>
            Is TOR:{" "}
            <Text style={stylesIPQ.value}>
              {dataIP.risk.is_tor ? "Yes" : "No"}
            </Text>
          </Text>
        )}
        {dataIP.risk && dataIP.risk.is_proxy !== undefined && (
          <Text style={stylesIPQ.textKey}>
            Is Proxy:{" "}
            <Text style={stylesIPQ.value}>
              {dataIP.risk.is_proxy ? "Yes" : "No"}
            </Text>
          </Text>
        )}
        {dataIP.risk && dataIP.risk.is_datacenter !== undefined && (
          <Text style={stylesIPQ.textKey}>
            Is Datacenter:{" "}
            <Text style={stylesIPQ.value}>
              {dataIP.risk.is_datacenter ? "Yes" : "No"}
            </Text>
          </Text>
        )}
        {dataIP.risk && dataIP.risk.risk_score != undefined && (
          <Text style={stylesIPQ.textKey}>
            Risk Score:{" "}
            <Text style={stylesIPQ.value}>{dataIP.risk.risk_score}</Text>
          </Text>
        )}
      </View>

      {/* Mapa */}
      {/* <View style={stylesIPQ.mapContainer}>
    <MapView
    style={stylesIPQ.map}
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
