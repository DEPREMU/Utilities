import {
  notis,
  appName,
  typeNotis,
  LanguageKeys,
  FIRST_TIME_KEY,
  saltHashPassword,
  ALL_NOTIFICATIONS,
  tableNameErrorLogs,
  LANGUAGE_KEY_STORAGE,
} from "./constants";
import uuid from "react-native-uuid";
import axios from "axios";
import bcrypt from "react-native-bcrypt";
import CryptoJS from "crypto-js";
import Constants from "expo-constants";
import languages from "../languages/languages";
import * as Network from "expo-network";
import { supabase } from "../database/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Localization from "expo-localization";
import * as Notifications from "expo-notifications";
import { TranslationsInterface } from "./TranslationsInterface";
import { Alert, Linking, Platform } from "react-native";
import { TableStreamers, dictNotifications } from "./interfaces";

export const capitalize = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const requestPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status == "granted") return true;
  await Notifications.requestPermissionsAsync();
  const { status: status1 } = await Notifications.getPermissionsAsync();
  if (status1 == "granted") return true;
  return false;
};

/**
 * Opens the specified URL.
 *
 * @param {string} link - The URL to be opened.
 * @param {object} translations - The translations.
 * @returns {void}
 */
export const openURL = (
  link: string,
  translations: TranslationsInterface
): void => {
  Alert.alert(translations.openURL, translations.askOpenURL, [
    {
      text: translations.no,
    },
    {
      text: translations.yes,
      onPress: () =>
        Linking.openURL(link).catch((err) =>
          console.error("Failed to open URL:", err)
        ),
    },
  ]);
};

export const generateToken = (): string => uuid.v4();

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hashSync(password, saltHashPassword);

export const initializeNotifications = async () => {
  const dict: dictNotifications = {} as dictNotifications;
  notis.forEach((value: typeNotis) => {
    dict[value] = {
      isActive: false,
      notificationKey: `NOTIFICATIONS_${value}`,
      timeMinSelected: 10,
      lastNotification: null,
      storageKey: `@${value.toUpperCase()}_STORAGE_KEY`,
      useForAnyNetwork: false,
      data: null,
    };
  });

  await saveData(ALL_NOTIFICATIONS, JSON.stringify(dict));
  await saveData(FIRST_TIME_KEY, "false");
};

export const verifyPassword = (
  originalPassword: string,
  inputPassword: string
): boolean => bcrypt.compareSync(inputPassword, originalPassword);

export const removeData = async (key: string) =>
  await AsyncStorage.removeItem(key);

export const removeDataSecure = async (key: string) => {
  try {
    if (Platform.OS == "web") localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch (error) {}
};

export const getLineError = () => {
  const error = new Error();
  const stackLine = error?.stack?.split("\n")[2];
  const lineNumberMatch = stackLine?.match(/:(\d+):\d+/);
  const lineNumber = lineNumberMatch ? lineNumberMatch[1] : null;
  return lineNumber;
};

export const getFileError = () => {
  const error = new Error();
  const stackLine = error?.stack?.split("\n")[2];
  const fileError = stackLine?.match(/\((.*):/);
  return fileError ? fileError[1] : null;
};

export const checkLanguage = async (): Promise<LanguageKeys> => {
  try {
    const data = await loadData(LANGUAGE_KEY_STORAGE);
    if (data) return data as LanguageKeys;

    const locales = Localization.getLocales()[0];
    const language = locales.languageTag.split("-")[0];
    const languageAvailable = languages.languages.indexOf(language) > -1;
    if (language && languageAvailable) {
      await saveData(LANGUAGE_KEY_STORAGE, language);
      return language as LanguageKeys;
    }
  } catch (error) {
    console.error(`${getFileError()} => ${error}`);
    await insertInTable(tableNameErrorLogs, {
      appName: appName,
      error: `${getFileError()} | Line: ${getLineError()} => ${error}`,
      date: new Date().toLocaleString(),
      component: `${getFileError()} | Line: ${getLineError()} => Language: ${error}`,
    });
  }
  return "en";
};

export const loadData = async (key: string) => await AsyncStorage.getItem(key);

export const loadDataSecure = async (key: string) => {
  if (Platform.OS != "web") return await SecureStore.getItemAsync(key);

  const value = localStorage.getItem(key);
  if (!value) return null;
  const uncryptedValue = CryptoJS.AES.decrypt(
    value,
    Constants.expoConfig?.extra?.SECRET_KEY_TO_ENCRYPT ||
      "8gvbni8g7f6dtcghjbihg7f6dtcg"
  ).toString(CryptoJS.enc.Utf8);
  return uncryptedValue;
};

export const saveData = async (key: string, value: any) =>
  await AsyncStorage.setItem(key, value);

export const saveDataSecure = async (key: string, value: any) => {
  try {
    if (!Constants.expoConfig || !Constants.expoConfig.extra) return;

    if (Platform.OS !== "web") await SecureStore.setItemAsync(key, value);
    else {
      const secretKey =
        Constants.expoConfig?.extra?.SECRET_KEY_TO_ENCRYPT ||
        "8gvbni8g7f6dtcghjbihg7f6dtcg";
      const encryptedValue = CryptoJS.AES.encrypt(value, secretKey);
      localStorage.setItem(key, encryptedValue.toString());
    }
  } catch (error) {
    console.error(`./globalVariables/saveDataSecure() => ${error}`);
  }
};

/**
 * Interpolates a message string with variables.
 *
 * @param {string} message - The message string to interpolate, must contain ${n} where n is the index inside arrTexts.
 * @param {Array} arrTexts - The variables to replace in the message string.
 * @returns {string} - The interpolated message string.
 * @example
 * const message = "Hello ${0}, welcome to ${1}!";
 * const variables = ["Tester", "our app"];
 * const interpolatedMessage = interpolateMessage(message, arrTexts);
 * console.log(interpolatedMessage); // Output: "Hello Tester, welcome to our app!"
 */
export const interpolateMessage = (
  message: string,
  arrTexts: string[]
): string =>
  String(message).replace(/\$\{(\d+)\}/g, (match, key) =>
    arrTexts[key] ? arrTexts[key] : match
  );

/**
 * Calculates the time difference in minutes from the given order time to the current time.
 *
 * @param {string} orderTime - The order time in a format recognized by the Date constructor (yyyy-mm-ddTHH:MM:SSZ).
 * @returns {number} - The time difference in minutes.
 * @example
 * **Current time 2024-09-27T12:10:00Z**
 * const orderTime = "2024-09-27T12:00:00Z";
 * const minutesPassed = calculateTime(orderTime);
 * console.log(minutesPassed); // Output: 10
 */
export const calculateTime = (time: Date | string): number => {
  const timeOrder = new Date(time);
  const diff: number = new Date().getTime() - timeOrder.getTime();
  const minutes = Math.floor(diff / 60000);
  return minutes;
};

const insertInTable = async (
  tableName: string,
  dict: { [key: string]: any }
): Promise<null | Error> => {
  try {
    await supabase.from(tableName).insert(dict);
  } catch (error) {
    return new Error(error as string);
  }
  return null;
};

export const getStartOfWeek = (date: Date | string): Date => {
  date = new Date(date);
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const diff = date.getDate() - dayOfWeek + (dayOfWeek == 0 ? -6 : 1); // Si es domingo, restamos 6 días
  const startOfWeek = new Date(date.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0); // Aseguramos que la hora sea las 00:00
  return startOfWeek;
};

export const getDataIPQuery = async (ip: string = "") => {
  const response = await axios.get(`https://api.ipquery.io/${ip}`, {
    timeout: 10000,
  });
  if (!response || response.status != 200) return null;
  const ipregex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;

  if (typeof response.data === "string" && ipregex.test(response.data))
    return response.data;
  else if (typeof response.data === "object")
    return JSON.stringify(response.data);

  return null;
};

export const getDataIP_api = async (ip: string) => {
  try {
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=66846719`,
      {
        timeout: 10000,
      }
    );
    return response && response.status === 200
      ? JSON.stringify(response.data)
      : null;
  } catch (error) {
    return null;
  }
};

export const getLinkImageStreamer = async (streamer: string) => {
  streamer = streamer.toLowerCase().replace(/\s+/g, "");
  const { data } = await axios.get(`https://www.twitch.tv/${streamer}`);
  if (!data) return;
  const imageElement = data
    .split(">")
    .find((e: string) => e.includes("og:image"));

  if (!imageElement) return;
  const image = imageElement
    .split(" ")
    .find((e: string) => e.includes("content="))
    .split('"')[1];

  return image;
};

export const isLiveStreamer = async (streamer: string): Promise<boolean> => {
  streamer = streamer.toLowerCase().replace(/\s+/g, "");
  const { data }: { data: string } = await axios.get(
    `https://www.twitch.tv/${streamer}`
  );

  const script = data
    .split(">")
    .find((e: string) => e.includes("isLiveBroadcast"));
  if (!script) return false;

  const json = JSON.parse(script.replace("</script", ""));
  const isLive = json["@graph"][0].publication.isLiveBroadcast;
  return isLive;
};

export const handleNotificationResponse = (navigation: any) => {
  Notifications.addNotificationResponseReceivedListener(
    async (response: Notifications.NotificationResponse) => {
      const screen = response.notification.request.content.data?.screen;

      if (!screen) return;

      navigation.replace(screen);
    }
  );
};

export const hasInternet = async () => {
  const networkState = await Network.getNetworkStateAsync();
  return networkState.isConnected && networkState.isInternetReachable;
};

export const isMobileNetwork = async (key: typeNotis) => {
  const allNotis: dictNotifications = await getAllNotifications();
  if (allNotis[key].useForAnyNetwork) return false;

  const { type, isConnected, isInternetReachable } =
    await Network.getNetworkStateAsync();
  return (
    type === Network.NetworkStateType.CELLULAR &&
    isConnected &&
    isInternetReachable
  );
};

export const getAllNotifications = async () => {
  const allNotis = await loadData(ALL_NOTIFICATIONS);
  const notifications: dictNotifications = JSON.parse(allNotis || "{}");

  return notifications;
};

export const getStreamersFromStorage = async () => {
  const allNotifications = await getAllNotifications();
  const streamersStorageKey = allNotifications.streamers.storageKey;

  return await loadData(streamersStorageKey);
};

export const getMessageLiveStreamers = async (streamers: string) => {
  const message: string[] = await Promise.all(
    JSON.parse(streamers).map(async (streamer: TableStreamers) =>
      (await isLiveStreamer(streamer.streamer))
        ? `${streamer.streamer} is live!`
        : ""
    )
  );

  return message.filter(Boolean).join("\n");
};

export const insertErrorMessageTable = async (
  error: string,
  component: string
) => {
  await insertInTable(tableNameErrorLogs, {
    appName,
    error,
    date: new Date().toISOString(),
    component,
  });
};

export const debounce = (
  func: (...args: any[]) => any,
  timeout: number
): ((...args: any[]) => void) => {
  let timer: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), timeout);
  };
};
