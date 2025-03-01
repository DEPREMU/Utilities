import {
  getDataIP_api,
  getDataIPQuery,
} from "../../utils/globalVariables/utils";
import {
  View,
  Alert,
  ScrollView,
  BackHandler,
  SafeAreaView,
} from "react-native";
import IPAPI from "../../components/IPsComponents/IPAPI";
import Loading from "../../components/common/Loading";
import IPQuery from "../../components/IPsComponents/IPQuery";
import { Text } from "react-native-paper";
import ErrorComponent from "../../components/common/Error";
import { ONBACKPRESS } from "../../utils/globalVariables/constants";
import { useFocusEffect } from "@react-navigation/native";
import { useStylesIPScreen } from "../../styles/stylesIPs/stylesIPScreen";
import React, { useEffect, useState } from "react";

type IPSCreenProps = {
  navigation: any;
};

type State = "idle" | "loading" | "error";

const IPScreen: React.FC<IPSCreenProps> = ({ navigation }) => {
  const styles = useStylesIPScreen();
  const thingsToLoad = 1;

  const [state, setState] = useState<State>("loading");
  const [errorText, setErrorText] = useState<string>("");
  const [ipAddress, setIpAddress] = useState<string>("");
  const [dataIp_API, setDataIp_API] = useState<string>("");
  const [dataIpQuery, setDataIpQuery] = useState<string>("");
  const [thingsLoaded, setThingsLoaded] = useState<number>(0);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Back", "Do you want to back to the menu selector?", [
          { text: "No", onPress: () => null },
          { text: "Yes", onPress: () => navigation.replace("Home") },
        ]);
        return true;
      };

      BackHandler.addEventListener(ONBACKPRESS, onBackPress);
      return () => BackHandler.removeEventListener(ONBACKPRESS, onBackPress);
    }, [navigation])
  );

  useEffect(() => {
    if (thingsLoaded >= thingsToLoad) setState("idle");
  }, [thingsLoaded]);

  useEffect(() => {
    const getIpAdressLocal = async () => {
      const data = await getDataIPQuery();
      if (!data) {
        setState("error");
        setErrorText("Error getting IP address");
        return;
      }
      if (data === ipAddress && ipAddress != "") return;
      setIpAddress(data);
      setThingsLoaded((prev) => prev + 1);
    };
    getIpAdressLocal();

    const timer = setInterval(() => {
      getIpAdressLocal();
    }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ipAddress) return;

    const getDataIPQueryLocal = async () => {
      const data = await getDataIPQuery(ipAddress);
      if (!data) return;

      setDataIpQuery(data);
    };

    const getDataIP_APILocal = async () => {
      const data = await getDataIP_api(ipAddress);
      if (!data) return;

      setDataIp_API(data);
    };

    getDataIPQueryLocal();
    getDataIP_APILocal();
  }, [ipAddress]);

  if (state === "loading")
    return (
      <Loading
        boolLoadingText={false}
        progress={thingsLoaded / thingsToLoad}
        boolActivityIndicator
      />
    );

  if (state === "error")
    return (
      <ErrorComponent
        errorText={errorText || "Unknown"}
        navigation={navigation}
        component="Home"
      />
    );

  if (state === "idle")
    return (
      <SafeAreaView style={styles.containerSafeAreaView}>
        <ScrollView
          style={styles.containerScrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.headerText}>IP Screen</Text>
          <Text style={styles.IP}>{ipAddress}</Text>
          {dataIpQuery !== "" && <IPQuery dataIPBefore={dataIpQuery} />}
          {dataIpQuery !== "" && dataIp_API !== "" && (
            <View style={styles.separator} />
          )}
          {dataIp_API !== "" && <IPAPI dataIPBefore={dataIp_API} />}
        </ScrollView>
      </SafeAreaView>
    );
};

export default IPScreen;
