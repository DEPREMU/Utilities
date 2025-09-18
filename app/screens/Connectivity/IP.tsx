import IP_API from "@components/IPs/IP_API";
import IPQuery from "@components/IPs/IPQuery";
import useStylesIPScreen from "@styles/screens/connectivity/useStylesIPScreen";
import { View, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { dataIP_API_JSON, dataIPQueryJSON } from "@types";
import { getIP, getDataIP_api, getDataIPQuery } from "@utils";

const InfoIP: React.FC = () => {
  const { styles } = useStylesIPScreen();

  const [ip, setIp] = useState<string | null>(null);
  const [dataIP_API, setDataIP_API] = useState<dataIP_API_JSON | null>(null);
  const [dataIPQuery, setDataIPQuery] = useState<dataIPQueryJSON | null>(null);

  useEffect(() => {
    const getIp = async () => {
      const IP = await getIP();
      setIp(IP);
    };

    getIp();
  }, []);

  useEffect(() => {
    if (!ip) return;

    const getDataIp = async () => {
      const data = await getDataIPQuery(ip);
      if (data) setDataIPQuery(data);
    };

    const getDataIpAPI = async () => {
      const data = await getDataIP_api(ip);
      if (data) setDataIP_API(data);
    };

    const get = async () => await Promise.all([getDataIp(), getDataIpAPI()]);

    get();
  }, [ip]);

  const ipAPI = <IP_API data={dataIP_API} />;
  const ipQuery = <IPQuery data={dataIPQuery} />;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.containerScrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {ipQuery}
        {ipQuery !== null && ipAPI !== null && (
          <View style={styles.separator} />
        )}
        {ipAPI}
      </ScrollView>
    </View>
  );
};

export default InfoIP;
