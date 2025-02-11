import bcrypt from "react-native-bcrypt";
import { Dimensions } from "react-native";

//? Keys
const appName = "Utilities";
const MONEY_CASH = "@cash";
const STORAGE_KEY = "@selected_cryptos";
const FIRST_TIME_KEY = "@firstTime";
const COSTS_KEY_STORAGE = "@products";
const NOTIFICATION_TASK = "BACKGROUND_CRYPTO_CURRENCY";
const ALL_NOTIFICATIONS = "@allNotifications";
const TableNameStreamers = "streamers";
const tableNameErrorLogs = "ErrorLogs";
const MONEY_BANK_ACCOUNT = "@bankAccount";
const MINUTES_STORAGE_KEY = "@minutesSelected";
const CRYPTOS_STORAGE_KEY = "@cryptos";
const DEEPL_TRANSLATOR_API = "b830b47d-6ddf-4599-b97c-f7ed1a515c32:fx";
const BACKGROUND_FETCH_TASK = "NOTIFICATIONS_CRYPTO_CURRENCY";

//? Images
const settingsImage = require("../../assets/settingsImage.png");

//? Constants
const { height, width } = Dimensions.get("window");
const arrMinutes: number[] = [1, 2, 5, 10, 20, 30, 60];
const saltHashPassword = bcrypt.genSaltSync(10);
const NOTIFICATIONS_IP = "Notifications IP";
const NOTIFICATIONS_KEY_STORAGE = "Notification Cryptos";

export {
  width,
  height,
  appName,
  arrMinutes,
  MONEY_CASH,
  STORAGE_KEY,
  settingsImage,
  FIRST_TIME_KEY,
  saltHashPassword,
  NOTIFICATIONS_IP,
  ALL_NOTIFICATIONS,
  COSTS_KEY_STORAGE,
  NOTIFICATION_TASK,
  TableNameStreamers,
  tableNameErrorLogs,
  MONEY_BANK_ACCOUNT,
  MINUTES_STORAGE_KEY,
  CRYPTOS_STORAGE_KEY,
  DEEPL_TRANSLATOR_API,
  BACKGROUND_FETCH_TASK,
  NOTIFICATIONS_KEY_STORAGE,
};
