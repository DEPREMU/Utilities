import {
  dataIP_APIJSON,
  dataIPQueryJSON,
} from "../../utils/globalVariables/interfaces";
import {
  getIP,
  getDataIP_api,
  getDataIPQuery,
} from "../../utils/globalVariables/utils";
import {
  View,
  Alert,
  StyleSheet,
  ScrollView,
  BackHandler,
  SafeAreaView,
} from "react-native";
import IP_API from "../../components/IPs/IP_API";
import IPQuery from "../../components/IPs/IPQuery";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";

interface IPProps {
  navigation: any;
}

const IP: React.FC<IPProps> = ({ navigation }) => {
  const [ip, setIp] = useState<string | null>(null);
  const [dataIP_API, setDataIP_API] = useState<dataIP_APIJSON | null>(null);
  const [dataIPQuery, setDataIPQuery] = useState<dataIPQueryJSON | null>(null);

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
    if (!ip) return;
    const getDataIp = async () => {
      const data = await getDataIPQuery(ip);
      if (data) setDataIPQuery(data);
    };

    const getDataIpapi = async () => {
      const data = await getDataIP_api(ip);
      if (data) setDataIP_API(data);
    };

    const get = async () => {
      await getDataIp();
      await getDataIpapi();
    };

    get();
  }, [ip]);

  return (
    <SafeAreaView style={styles.containerSafeAreaView}>
      <ScrollView
        style={styles.containerScrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {dataIPQuery && <IPQuery dataIP={dataIPQuery} />}
        {dataIP_API && <View style={styles.separator} />}
        {dataIP_API && <IP_API dataIP={dataIP_API} />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  containerSafeAreaView: {
    flex: 1,
    width: "100%",
  },
  containerScrollView: {
    flex: 1,
    width: "100%",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  separator: {
    height: 10,
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
    width: "90%",
    marginVertical: 16,
  },
});

export default IP;
