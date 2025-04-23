import bcrypt from "react-native-bcrypt";
import languages from "../languages/languages";

export type LanguageKeys = Exclude<
  keyof typeof languages,
  "languages" | "languagesNames"
>;

//! Add each new notification
export type typeNotis = "streamers" | "ipData";
export const notis: typeNotis[] = ["streamers", "ipData"];

//? Keys
const appName = "Utilities";
const MONEY_CASH = "@cash";
const ONBACKPRESS = "hardwareBackPress";
const STORAGE_KEY = "@selected_cryptos";
const FIRST_TIME_KEY = "@firstTime";
const COSTS_KEY_STORAGE = "@products";
const TOKEN_KEY_STORAGE = "_tokenKeyStorage";
const ALL_NOTIFICATIONS = "@allNotifications";
const LAST_NOTIFICATIONS = "@lastNotifications";
const THEME_KEY_STORAGE = "@themeKeyStorage";
const TableNameStreamers = "streamers";
const tableNameErrorLogs = "ErrorLogs";
const MONEY_BANK_ACCOUNT = "@bankAccount";
const MINUTES_STORAGE_KEY = "@minutesSelected";
const CRYPTOS_STORAGE_KEY = "@cryptos";
const LANGUAGE_KEY_STORAGE = "@language";
const DEEPL_TRANSLATOR_API = "b830b47d-6ddf-4599-b97c-f7ed1a515c32:fx";
const USERNAME_KEY_STORAGE = "_usernameKeyStorage";

//? Images
const settingsImage = require("../../assets/settingsImage.png");
const userImage = require("../../assets/userImage.png");

//? Constants
const arrMinutes: number[] = [1, 2, 5, 10, 20, 30, 60];
const tableNameUsers = "Users";
const tableNameStreamersUsers = "StreamersUsers";
const saltHashPassword = bcrypt.genSaltSync(10);

export {
  appName,
  userImage,
  arrMinutes,
  MONEY_CASH,
  ONBACKPRESS,
  STORAGE_KEY,
  settingsImage,
  tableNameUsers,
  FIRST_TIME_KEY,
  saltHashPassword,
  THEME_KEY_STORAGE,
  TOKEN_KEY_STORAGE,
  ALL_NOTIFICATIONS,
  COSTS_KEY_STORAGE,
  TableNameStreamers,
  LAST_NOTIFICATIONS,
  tableNameErrorLogs,
  MONEY_BANK_ACCOUNT,
  MINUTES_STORAGE_KEY,
  CRYPTOS_STORAGE_KEY,
  USERNAME_KEY_STORAGE,
  LANGUAGE_KEY_STORAGE,
  DEEPL_TRANSLATOR_API,
  tableNameStreamersUsers,
};
