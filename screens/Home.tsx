import Animated, {
  withSpring,
  SharedValue,
  useSharedValue,
} from "react-native-reanimated";
import languages, {
  ONBACKPRESS,
  LanguageKeys,
  settingsImage,
  checkLanguage,
  loadDataSecure,
  TOKEN_KEY_STORAGE,
} from "../utils";
import {
  Text,
  Alert,
  Image,
  Pressable,
  ScrollView,
  BackHandler,
  PanResponder,
  SafeAreaView,
} from "react-native";
import ButtonLocal from "../components/Home/ButtonComponent";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import useStylesHome from "../styles/stylesHome";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";

type HomeProps = {
  navigation: any;
};

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const styles = useStylesHome();
  const getTranslations = () => languages[lang as LanguageKeys];
  const [lang, setLang] = useState<LanguageKeys>("en");
  const [token, setToken] = useState<string | null>(null);
  const [boolShowNavBar, setBoolShowNavBar] = useState<boolean>(false);

  const positionNav: SharedValue<number> = useSharedValue<number>(-250);

  const hideNavBar = () => {
    setBoolShowNavBar(false);
    positionNav.value = withSpring(-250, {
      stiffness: 100,
      damping: 10,
      overshootClamping: true,
    });
  };

  const showNavBar = () => {
    setBoolShowNavBar(true);
    positionNav.value = withSpring(0, {
      stiffness: 100,
      damping: 100,
      overshootClamping: true,
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) =>
        Math.abs(gestureState.dx) > 40,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) hideNavBar();
        else if (gestureState.dx > 50) showNavBar();
      },
    })
  ).current;

  useEffect(() => {
    const getLangugage = async () => {
      setLang(await checkLanguage());
    };
    const getToken = async () => {
      const token = await loadDataSecure(TOKEN_KEY_STORAGE);
      setToken(token);
    };

    getToken();
    getLangugage();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const translations = getTranslations();
        Alert.alert(translations.exit, translations.askExitApp, [
          { text: translations.no, onPress: () => null },
          { text: translations.yes, onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };

      BackHandler.addEventListener(ONBACKPRESS, onBackPress);
      return () => BackHandler.removeEventListener(ONBACKPRESS, onBackPress);
    }, [navigation])
  );

  const handleNavigator = () => {
    if (boolShowNavBar) hideNavBar();
    else showNavBar();
  };

  const translations = getTranslations();

  return (
    <SafeAreaView style={{ flex: 1 }} {...panResponder.panHandlers}>
      <StatusBar style="auto" backgroundColor="transparent" />
      <Animated.View style={[styles.navBar, { left: positionNav }]}>
        <ScrollView
          style={styles.containerScrollViewNavBar}
          contentContainerStyle={styles.contentContainerNavBar}
        >
          {token === null && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.buttonNavBar,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
                onPress={() => navigation.replace("Login")}
              >
                <Text style={styles.textButtonNav}>{translations.login}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.buttonNavBar,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
                onPress={() => navigation.replace("Signin")}
              >
                <Text style={styles.textButtonNav}>{translations.signin}</Text>
              </Pressable>
            </>
          )}
          {token !== null && (
            <Pressable
              style={({ pressed }) => [
                styles.buttonNavBar,
                { opacity: pressed ? 0.5 : 1 },
              ]}
              onPress={() => navigation.replace("Profile")}
            >
              <Text style={styles.textButtonNav}>{translations.profile}</Text>
            </Pressable>
          )}
          <ButtonLocal
            text={translations.settings}
            component="Settings"
            navigation={navigation}
            buttonStyle={styles.buttonNavBar}
            buttonText={styles.textButtonNav}
          />
        </ScrollView>
      </Animated.View>
      <Pressable style={styles.container} onPress={() => hideNavBar()}>
        <Pressable
          onPress={() => handleNavigator()}
          style={({ pressed }) => [
            styles.headerContainer,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Image source={settingsImage} style={styles.imageSettings} />
        </Pressable>

        <Text style={styles.headerText}>{translations.navigation}</Text>
        <ScrollView
          style={styles.scrollViewButtonContainer}
          contentContainerStyle={styles.buttonContainer}
          showsVerticalScrollIndicator={false}
        >
          <ButtonLocal
            text={translations.ipData}
            component="IPScreen"
            navigation={navigation}
            buttonStyle={styles.button}
            buttonText={styles.buttonText}
          />
          <ButtonLocal
            text={translations.streamers}
            component="Streamers"
            navigation={navigation}
            buttonStyle={styles.button}
            buttonText={styles.buttonText}
          />
        </ScrollView>
      </Pressable>
    </SafeAreaView>
  );
};

export default Home;
