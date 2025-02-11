import {
  width,
  appName,
  STORAGE_KEY,
  saltHashPassword,
  tableNameErrorLogs,
  MINUTES_STORAGE_KEY,
  DEEPL_TRANSLATOR_API,
  BACKGROUND_FETCH_TASK,
  NOTIFICATIONS_KEY_STORAGE,
  ALL_NOTIFICATIONS,
  NOTIFICATIONS_IP,
} from "./constants";
import uuid from "react-native-uuid";
import axios from "axios";
import bcrypt from "react-native-bcrypt";
import CryptoJS from "crypto-js";
import Constants from "expo-constants";
import { supabase } from "../database/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Localization from "expo-localization";
import { getDataSingle } from "../database/dataBaseConnection";
import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import { Alert, Linking, Platform } from "react-native";
import { dataIP_APIJSON, dataIPQueryJSON } from "./interfaces";

const capitalize = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const getPriceCrypto = async (crypto: string): Promise<number> => {
  try {
    const responseUsd = await axios.get(
      "https://api.binance.com/api/v3/ticker/price",
      {
        params: {
          symbol: `${crypto.toUpperCase()}USDT`,
        },
      }
    );
    if (responseUsd) return responseUsd.data.price;
  } catch {}
  return -1;
};

const requestPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status == "granted") return true;
  await Notifications.requestPermissionsAsync();
  try {
    const { status: status1 } = await Notifications.getPermissionsAsync();
    if (status1 == "granted") return true;
  } catch (error) {
    console.error(`Error adding minutes: ${error}`);
  }
  return false;
};

const registerBackgroundFetchCryptos = async () => {
  if (!(await requestPermissions())) return;

  const selectedMinutes = await loadData(MINUTES_STORAGE_KEY);
  const selectedCryptos = await loadData(STORAGE_KEY);
  const notifications = await loadData(NOTIFICATIONS_KEY_STORAGE);
  if (!notifications) return await saveData(NOTIFICATIONS_KEY_STORAGE, "false");
  try {
    if (notifications == "false")
      return await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
    else if (
      notifications == "true" &&
      selectedCryptos &&
      JSON.parse(selectedCryptos).length > 0
    ) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 60 * parseInt(selectedMinutes || "2"),
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (error) {}
};

/**
 * Opens the specified URL.
 *
 * @param {string} link - The URL to be opened.
 * @returns {void}
 */
const openURL = (link: string): void => {
  Alert.alert("You are opening a link", "Do you want to continue?", [
    {
      text: "No",
    },
    {
      text: "yes",
      onPress: () =>
        Linking.openURL(link).catch((err) =>
          console.error("Failed to open URL:", err)
        ),
    },
  ]);
};

const fetchPrices = async (selectedCryptos: string): Promise<string> => {
  try {
    const cryptos = JSON.parse(selectedCryptos);
    const prices = await Promise.all(
      cryptos.map(async (key: string) => {
        try {
          const responseUsd = await axios.get(
            "https://api.binance.com/api/v3/ticker/price",
            {
              params: {
                symbol: `${key.toUpperCase()}USDT`,
              },
            }
          );
          const money = parseFloat(responseUsd.data.price).toFixed(5);
          const { data } = await getDataSingle(
            "cryptos",
            "cryptoName",
            "cryptoKey",
            key
          );
          return `${data?.cryptoName || key}: ${money} USD`;
        } catch (error) {
          console.error(`Error fetching price for ${key}:`, error);
          return `${key}: Error fetching price`;
        }
      })
    );

    return prices.join("\n");
  } catch (error) {
    console.error("Error fetching prices:", error);
    return "Error fetching prices";
  }
};

const translate = async (text: string, targetLang: string): Promise<string> => {
  const url = "https://api-free.deepl.com/v2/translate";

  if (!text || !targetLang) return "Error de argumentos";
  try {
    const response = await axios.post(url, null, {
      params: {
        auth_key: DEEPL_TRANSLATOR_API,
        text: text,
        target_lang: targetLang,
      },
    });

    return response.data.translations[0].text;
  } catch (error) {
    return `Error en la traducción: ${error}`;
  }
};

const generateToken = (): string => uuid.v4();
const widthDivided = (num: number): number => width / num;

const hashPassword = (password: string): string =>
  bcrypt.hashSync(password, saltHashPassword);

const verifyPassword = (
  originalPassword: string,
  inputPassword: string
): boolean => bcrypt.compareSync(inputPassword, originalPassword);

// const checkLanguage = async () => {
//   try {
//     const data = await loadData(LANGUAGE_KEY_STORAGE);
//     if (data) return data;

//     const locales = Localization.getLocales()[0];
//     const language = locales.languageTag.split("-")[0];
//     const languageAvailable = languages.languages.indexOf(language) > -1;
//     if (language && languageAvailable) {
//       await saveData(LANGUAGE_KEY_STORAGE, language);
//       return language;
//     }
//   } catch (error) {
//     console.error(`./globalVariables/checkLanguage() => ${error}`);
//     await insertInTable(tableNameErrorLogs, {
//       appName: appName,
//       error: `./globalVariables/checkLanguage() => ${error}`,
//       date: new Date().toLocaleString(),
//       component: `./globalVariables/checkLanguage() catch (error) => Language: ${error}`,
//     });
//   }
//   return "en";
// };

const removeData = async (key: string) => await AsyncStorage.removeItem(key);

const removeDataSecure = async (key: string) => {
  try {
    if (Platform.OS == "web") localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch (error) {}
};

const loadData = async (key: string) => await AsyncStorage.getItem(key);

const loadDataSecure = async (key: string) => {
  if (Platform.OS != "web") return await SecureStore.getItemAsync(key);

  const value = localStorage.getItem(key);
  if (!value) return null;
  const uncryptedValue = CryptoJS.AES.decrypt(
    value,
    Constants.expoConfig?.extra?.SECRET_KEY_TO_ENCRYPT
  ).toString(CryptoJS.enc.Utf8);
  return uncryptedValue;
};

const saveData = async (key: string, value: any) =>
  await AsyncStorage.setItem(key, value);

const saveDataSecure = async (key: string, value: any) => {
  try {
    if (!Constants.expoConfig || !Constants.expoConfig.extra) return;

    if (Platform.OS != "web") await SecureStore.setItemAsync(key, value);
    else {
      const secretKey = Constants.expoConfig.extra.SECRET_KEY_TO_ENCRYPT;
      const encryptedValue = CryptoJS.AES.encrypt(value, secretKey);
      localStorage.setItem(key, encryptedValue.toString());
    }
  } catch (error) {
    console.error(`./globalVariables/saveDataSecure() => ${error}`);
    await insertInTable(tableNameErrorLogs, {
      appName: appName,
      error: `./globalVariables/saveDataSecure() => ${error}`,
      date: new Date().toLocaleString(),
      component: `./globalVariables/saveDataSecure() catch (error) => SaveDataSecure: ${error}`,
    });
  }
};

/**
 * Interpolates a message string with variables.
 *
 * @param {string} message - The message string to interpolate, must contain ${n} where n is the index inside arrTexts.
 * @param {Array} arrTexts - The variables to replace in the message string.
 * @returns {string} - The interpolated message string.
 * @example
 * const message = `Hello ${0}` welcome to ${1}!";
 * const variables = ["Tester", "our app"];
 * const interpolatedMessage = interpolateMessage(message, arrTexts);
 * console.log(interpolatedMessage); // Output: "Hello Tester, welcome to our app!"
 */
const interpolateMessage = (message: string, arrTexts: string[]): string =>
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
const calculateTime = (orderTime: Date | string): number => {
  const timeOrder = new Date(orderTime);
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

const getStartOfWeek = (date: Date | string): Date => {
  date = new Date(date);
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const diff = date.getDate() - dayOfWeek + (dayOfWeek == 0 ? -6 : 1); // Si es domingo, restamos 6 días
  const startOfWeek = new Date(date.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0); // Aseguramos que la hora sea las 00:00
  return startOfWeek;
};

const getIP = async () => {
  const { data } = await axios.get("https://api.ipquery.io/");
  return data;
};

const getDataIPQuery = async (ip: string): Promise<dataIPQueryJSON | null> => {
  const response = await axios.get(`https://api.ipquery.io/${ip}`, {
    timeout: 10000,
  });
  return response.status === 200 ? response.data : null;
};

const getDataIP_api = async (ip: string): Promise<dataIP_APIJSON | null> => {
  try {
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=66846719`,
      {
        timeout: 10000,
      }
    );
    return response.status === 200 ? response.data : null;
  } catch (error) {
    return null;
  }
};

const initializateNotis = async () => {
  requestPermissions();
  const allNotis = {
    [NOTIFICATIONS_IP]: false,
  };
  saveData(ALL_NOTIFICATIONS, JSON.stringify(allNotis));
};

const notificationCryptos = async () => {
  try {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {}

    const selectedCryptos = await loadData(STORAGE_KEY);
    if (!selectedCryptos || JSON.parse(selectedCryptos).length == 0) return;
    const message = await fetchPrices(selectedCryptos);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Cryptocurrency Update",
        body: message,
      },
      trigger: null,
    });
  } catch (error) {
    console.error(error);
  }
};

const notificationIP = async (minutesSelected: number) => {
  try {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {}

    const ip = await getIP();
    if (!ip) return;
    const reponse: any = await getDataIPQuery(ip);
    if (!reponse || reponse.status != 200) return;
    const data: dataIPQueryJSON = reponse.data;
    if (!data) return;
    const message = `IP: ${ip}\nISP: ${data.isp.org}\nCountry: ${data.location.country}\nCity: ${data.location.city}`;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "IP Updated",
        body: message,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutesSelected * 60,
      },
    });
  } catch (error) {
    console.error(error);
  }
};

export {
  getIP,
  openURL,
  loadData,
  saveData,
  translate,
  removeData,
  capitalize,
  fetchPrices,
  hashPassword,
  widthDivided,
  getDataIP_api,
  insertInTable,
  calculateTime,
  generateToken,
  getDataIPQuery,
  notificationIP,
  getStartOfWeek,
  verifyPassword,
  saveDataSecure,
  getPriceCrypto,
  loadDataSecure,
  removeDataSecure,
  initializateNotis,
  requestPermissions,
  interpolateMessage,
  notificationCryptos,
  registerBackgroundFetchCryptos,
};
