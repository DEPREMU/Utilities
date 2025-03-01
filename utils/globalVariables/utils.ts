import { appName, saltHashPassword, tableNameErrorLogs } from "./constants";
import uuid from "react-native-uuid";
import axios from "axios";
import bcrypt from "react-native-bcrypt";
import CryptoJS from "crypto-js";
import Constants from "expo-constants";
import { supabase } from "../database/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";
import { Alert, Linking, Platform } from "react-native";

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
 * @returns {void}
 */
export const openURL = (link: string): void => {
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

export const generateToken = (): string => uuid.v4();

export const hashPassword = (password: string): string =>
  bcrypt.hashSync(password, saltHashPassword);

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

    if (Platform.OS != "web") await SecureStore.setItemAsync(key, value);
    else {
      const secretKey =
        Constants.expoConfig?.extra?.SECRET_KEY_TO_ENCRYPT ||
        "8gvbni8g7f6dtcghjbihg7f6dtcg";
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
