import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
} from "react-native";
import { Text, TextInput } from "react-native-paper";
import { useStylesStreamers } from "../../styles/socialMedia/stylesStreamers";
import axios from "axios";
import {
  capitalize,
  checkLanguage,
  getAllNotifications,
  getLineError,
  getLinkImageStreamer,
  getStreamersFromStorage,
  hasInternet,
  initializeNotifications,
  insertErrorMessageTable,
  interpolateMessage,
  isLiveStreamer,
  loadData,
  loadDataSecure,
  openURL,
  saveData,
  saveDataSecure,
} from "../../utils/globalVariables/utils";
import {
  ALL_NOTIFICATIONS,
  LanguageKeys,
  ONBACKPRESS,
  tableNameStreamersUsers,
  tableNameUsers,
  TOKEN_KEY_STORAGE,
  typeNotis,
  userImage,
  USERNAME_KEY_STORAGE,
} from "../../utils/globalVariables/constants";
import { useFocusEffect } from "@react-navigation/native";
import Loading from "../../components/common/Loading";
import {
  deleteFromDictMatch,
  getAllDataEq,
  insertData,
} from "../../utils/database/dataBaseConnection";
import languages from "../../utils/languages/languages";
import { dictNotifications } from "../../utils/globalVariables/interfaces";
import { sendNotificationNoInternet } from "../../utils/Notifications";

interface StreamersProps {
  navigation: any;
}

type typeStreamer = {
  id: string;
  email: string;
  username: string;
  streamer: string;
  linkImage: string | null;
  isLive: boolean;
};

const Streamers: React.FC<StreamersProps> = ({ navigation }) => {
  const styles = useStylesStreamers();
  const getTranslations = () => languages[lang];

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
  const thingsToLoad = 1;
  const nameScreen: typeNotis = "streamers";

  const [lang, setLang] = useState<LanguageKeys>("en");
  const [state, setState] = useState<"loading" | "idle">("loading");
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [streamer, setStreamer] = useState<string>("");
  const [streamers, setStreamers] = useState<typeStreamer[]>([]);
  const [thingsLoaded, setThingsLoaded] = useState<number>(0);
  const [boolLoadStreamers, setBoolLoadStreamers] = useState<boolean>(false);

  useEffect(() => {
    const loadLanguage = async () => setLang(await checkLanguage());
    const loadUserInfo = async () => {
      setToken(await loadDataSecure(TOKEN_KEY_STORAGE));
      setUsername(await loadDataSecure(USERNAME_KEY_STORAGE));
      setThingsLoaded((prev) => prev + 1);
      setBoolLoadStreamers(true);
    };
    loadLanguage();
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (!boolLoadStreamers) return;
    if (token && !username) {
      const translations = getTranslations();
      return Alert.alert(
        translations.error,
        translations.errorLoadingStreamers,
        [{ text: translations.ok }]
      );
    }

    const loadStreamers = async () => {
      try {
        const translations = getTranslations();
        const boolHasInternet = await hasInternet();

        let data: typeStreamer[];

        if (boolHasInternet) {
          const { data: internetData } = await getAllDataEq(
            tableNameStreamersUsers,
            "username",
            username
          );

          data = internetData ?? [];
        } else {
          data = JSON.parse((await getStreamersFromStorage()) || "[]");
        }

        if (data && data.length === 0) return;
        if (!data) {
          return Alert.alert(
            translations.error,
            translations.errorLoadingStreamers,
            [{ text: translations.ok }]
          );
        }

        const allNotis: dictNotifications = JSON.parse(
          (await loadData(ALL_NOTIFICATIONS)) || "{}"
        );
        const streamersKeyStorage = allNotis?.streamers?.storageKey;

        const allStreamers: typeStreamer[] = await Promise.all(
          data.map((streamer: typeStreamer) => {
            return { ...streamer, isLive: false } as typeStreamer;
          })
        );

        let newData: typeStreamer[] | null = null;
        if (boolHasInternet)
          newData = await Promise.all(
            allStreamers.map(async (streamer: typeStreamer) => {
              return {
                ...streamer,
                isLive: await isLiveStreamer(streamer.streamer),
              };
            })
          );

        if (!boolHasInternet)
          await sendNotificationNoInternet(
            translations.errorNoInternetTitle,
            translations.errorNoInternetBody,
            nameScreen
          );
        await saveData(streamersKeyStorage, JSON.stringify(allStreamers));

        setStreamers(newData ? newData : allStreamers);
      } catch (error) {
        console.error(error);
        await insertErrorMessageTable(
          `Error loading streamers: ${error}`,
          `${nameScreen} => loadStreamers => ${getLineError()}`
        );
      }
    };
    loadStreamers();
    setBoolLoadStreamers(false);
  }, [token, boolLoadStreamers, username]);

  useEffect(() => {
    if (thingsLoaded >= thingsToLoad) setState("idle");
  }, [thingsLoaded]);

  const askAddStreamer = async () => {
    const translations = getTranslations();
    const streamerName = capitalize(streamer);
    Alert.alert(
      interpolateMessage(translations.askAddStreamerTitle, [streamerName]),
      interpolateMessage(translations.askAddStreamerBody, [streamerName]),
      [
        { text: translations.no, onPress: () => null },
        { text: translations.yes, onPress: () => addStreamer() },
      ],
      { cancelable: false }
    );
  };

  const addStreamer = async () => {
    if (!streamer) return;
    if (!token) return;
    const translations = getTranslations();
    if (
      streamers.find(
        (element) =>
          element.streamer.replaceAll(" ", "").toLowerCase() ===
          streamer.replaceAll(" ", "").toLowerCase()
      )
    )
      return Alert.alert(
        translations.error,
        translations.errorStreamerAlreadyAdded,
        [{ text: translations.ok, onPress: () => setBoolLoadStreamers(true) }]
      );

    const imageStreamer = await getLinkImageStreamer(streamer);
    const { data } = await getAllDataEq(tableNameUsers, "token", token);
    if (!data || data.length === 0)
      return Alert.alert(translations.error, translations.errorAddingStreamer, [
        { text: translations.ok },
      ]);

    const { error } = await insertData(tableNameStreamersUsers, {
      username: data[0].username,
      email: data[0].email,
      streamer: streamer,
      linkImage: imageStreamer,
    });

    if (error) {
      console.error(error);
      await insertErrorMessageTable(
        `Error adding streamer: ${error}`,
        `${nameScreen} => addStreamer => ${getLineError()}`
      );
    }

    setBoolLoadStreamers(true);
    setStreamer("");
  };

  const askDeleteStreamer = (id: string) => {
    const translations = getTranslations();
    const streamerName = capitalize(
      streamers.find((element) => element.id === id)?.streamer || ""
    );
    Alert.alert(
      interpolateMessage(translations.askDeleteStreamerTitle, [streamerName]),
      interpolateMessage(translations.askDeleteStreamerBody, [streamerName]),
      [
        { text: translations.no, onPress: () => null },
        { text: translations.yes, onPress: () => deleteStreamer(id) },
      ],
      { cancelable: false }
    );
  };

  const deleteStreamer = async (id: string) => {
    const translations = getTranslations();
    const { error } = await deleteFromDictMatch(tableNameStreamersUsers, {
      id: id,
      username: username,
    });

    if (error) {
      console.error(error);
      await insertErrorMessageTable(
        `Error deleting streamer: ${error}`,
        `${nameScreen} => deleteStreamer => ${getLineError()}`
      );
      return Alert.alert(
        translations.error,
        translations.errorDeletingStreamer,
        [{ text: translations.ok }]
      );
    }

    setBoolLoadStreamers(true);
  };

  if (state === "loading") return <Loading boolActivityIndicator />;

  const translations = getTranslations();

  if (state === "idle")
    return (
      <SafeAreaView style={styles.containerSafeAreaView}>
        <Text style={styles.title}>{translations.streamers}</Text>
        <View style={styles.containerAdd}>
          <TextInput
            style={styles.textInput}
            placeholder={translations.addStreamer}
            onChangeText={setStreamer}
            value={streamer}
          />
          <Pressable
            style={({ pressed }) => [
              styles.buttonAdd,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() => askAddStreamer()}
          >
            <Text style={styles.textButton}>{translations.addStreamer}</Text>
          </Pressable>
        </View>
        <Text style={styles.youreStreamers}>{translations.youreStreamers}</Text>
        <ScrollView
          style={styles.containerScrollView}
          contentContainerStyle={styles.contentContainer}
        >
          {streamers.map((streamer: typeStreamer, index) => (
            <View key={index} style={styles.containerStreamer}>
              <View style={styles.containerImageAndName}>
                <Image
                  source={
                    streamer.linkImage ? { uri: streamer.linkImage } : userImage
                  }
                  style={styles.streamerImage}
                />
                <Text style={styles.nameStreamer}>
                  {capitalize(streamer.streamer)}
                </Text>
              </View>
              <View style={styles.containerData}>
                <Text style={styles.isLiveStreamer}>
                  {streamer.isLive ? "Live" : "Offline"}
                </Text>
                <View style={styles.containerButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.buttonVisit,
                      { opacity: pressed ? 0.5 : 1 },
                    ]}
                    onPress={() =>
                      openURL(
                        `https://www.twitch.tv/${streamer.streamer.toLowerCase()}`,
                        translations
                      )
                    }
                  >
                    <Text style={styles.textButton}>{translations.open}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.buttonVisit,
                      { opacity: pressed ? 0.5 : 1 },
                    ]}
                    onPress={() => askDeleteStreamer(streamer.id)}
                  >
                    <Text style={styles.textButton}>{translations.delete}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
};

export default Streamers;
