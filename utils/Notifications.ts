import {
  typeNotis,
  ALL_NOTIFICATIONS,
  USERNAME_KEY_STORAGE,
} from "./globalVariables/constants";
import {
  dataIP_APIJSON,
  dictNotifications,
  dictKeyNotifications,
} from "./globalVariables/interfaces";
import {
  saveData,
  loadData,
  hasInternet,
  checkLanguage,
  getDataIP_api,
  getDataIPQuery,
  loadDataSecure,
  isMobileNetwork,
  interpolateMessage,
  getAllNotifications,
  getStreamersFromStorage,
  getMessageLiveStreamers,
  initializeNotifications,
} from "./globalVariables/utils";
import languages from "./languages/languages";
import * as Notifications from "expo-notifications";
import * as BackgroundFetch from "expo-background-fetch";

export const notificationsStreamers = async () => {
  if (!isAppropriateTimeForNotification()) return;
  const keyNotification: typeNotis = "streamers";

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  await deleteOldNotification(keyNotification);

  const streamers = await getStreamersFromStorage();
  if (!streamers || JSON.parse(streamers).lenght === 0) return;

  const username = await loadDataSecure(USERNAME_KEY_STORAGE);
  if (!username) return;

  const translations = languages[await checkLanguage()];

  if (!(await isMobileNetwork(keyNotification)))
    return await sendNotificationMobileNetwork(
      translations.errorMobileNetworkTitle,
      translations.errorMobileNetworkBody,
      keyNotification
    );

  const body = await getMessageLiveStreamers(streamers);
  if (!body) return;

  const title = translations.notificationsStreamersTitle;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: { screen: keyNotification },
    },
    trigger: null,
  });
  await saveIdentifier(identifier, keyNotification);
};

export const notificationsIPData = async () => {
  if (!isAppropriateTimeForNotification()) return;
  const keyNotification: typeNotis = "ipData";

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const translations = languages[await checkLanguage()];

  await deleteOldNotification(keyNotification);

  if (!(await hasInternet()))
    return await sendNotificationNoInternet(
      translations.errorNoInternetTitle,
      translations.errorNoInternetBody,
      keyNotification
    );

  if (await isMobileNetwork(keyNotification))
    return await sendNotificationMobileNetwork(
      translations.errorMobileNetworkTitle,
      translations.errorMobileNetworkBody,
      keyNotification
    );

  const ip = await getDataIPQuery();
  if (!ip)
    return await sendNotificationNoIP(
      translations.errorGettingIPTitle,
      translations.errorGettingIPBody
    );

  const dataIP = await getDataIP_api(ip);
  if (!dataIP)
    return await sendNotificationNoDataIP(
      translations.errorGettingIPDataTitle,
      translations.errorGettingIPDataBody
    );

  const dataIPJSON: dataIP_APIJSON = await JSON.parse(dataIP);

  const title = interpolateMessage(translations.successGettingIPTitle, [ip]);
  const message = makeMessageIPData(
    dataIPJSON,
    translations.successGettingIPAndDataIP
  );

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: message,
      data: { screen: keyNotification },
    },
    trigger: null,
  });
  await saveIdentifier(identifier, keyNotification);
};

export const registerBackgroundFetchs = async (
  dictKeyNotifications: dictKeyNotifications
) => {
  try {
    await BackgroundFetch.registerTaskAsync(
      dictKeyNotifications.notificationKey,
      {
        minimumInterval: 60 * (dictKeyNotifications.timeMinSelected || 10),
        stopOnTerminate: false, // Si la tarea debe detenerse cuando la aplicación se cierra
        startOnBoot: true, // Si la tarea debe iniciarse cuando el dispositivo se reinicia
      }
    );
    console.log("Background fetch task registered");
  } catch (error) {
    console.error("Error registering background fetch task:", error);
  }
};

export const unRegisterTask = async (key: string) => {
  try {
    await BackgroundFetch.unregisterTaskAsync(key);
  } catch (error) {}
};

export const saveIdentifier = async (identifier: string, key: typeNotis) => {
  const allNotis = await getAllNotifications();
  allNotis[key].lastNotification = identifier;
  await saveData(ALL_NOTIFICATIONS, JSON.stringify(allNotis));
};

export const sendNotificationNoIP = async (
  errorGettingIPTitle: string,
  errorGettingIPBody: string
) => {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: errorGettingIPTitle,
      body: errorGettingIPBody,
      data: { screen: "ipData" },
    },
    trigger: null,
  });
  await saveIdentifier(identifier, "ipData");
};

export const sendNotificationNoDataIP = async (
  errorGettingIPDataTitle: string,
  errorGettingIPDataBody: string
) => {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: errorGettingIPDataTitle,
      body: errorGettingIPDataBody,
      data: { screen: "ipData" },
    },
    trigger: null,
  });
  await saveIdentifier(identifier, "ipData");
};

export const makeMessageIPData = (
  dataIPJSON: dataIP_APIJSON,
  successGettingIPAndDataIP: string
): string =>
  interpolateMessage(successGettingIPAndDataIP, [
    dataIPJSON.country,
    dataIPJSON.countryCode,
    dataIPJSON.region,
    dataIPJSON.regionName,
    dataIPJSON.city,
    dataIPJSON.isp,
    dataIPJSON.query,
  ]);

export const deleteOldNotification = async (key: typeNotis) => {
  const allNotis = await loadData(ALL_NOTIFICATIONS);
  if (!allNotis) return await initializeNotifications();

  const notifications = JSON.parse(allNotis) as dictNotifications;
  if (!notifications[key].lastNotification) return;

  await Notifications.cancelScheduledNotificationAsync(
    notifications[key].lastNotification
  );
};

/**
 * Determines if the current time is appropriate for sending a notification.
 *
 * This function checks the current hour and returns `true` if the hour is between 8 AM and 10 PM (inclusive),
 * indicating that it is an appropriate time for sending notifications. Otherwise, it returns `false`.
 *
 * @returns {boolean} `true` if the current time is between 8 AM and 10 PM, otherwise `false`.
 */
export const isAppropriateTimeForNotification = (): boolean => {
  const currentHour = new Date().getHours();
  return currentHour >= 8 && currentHour <= 22;
};

export const sendNotificationNoInternet = async (
  errorNoInternetTitle: string,
  errorNoInternetBody: string,
  key: typeNotis
) => {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: errorNoInternetTitle,
      body: errorNoInternetBody,
      data: { screen: key },
    },
    trigger: null,
  });
  await saveIdentifier(identifier, key);
};

export const sendNotificationMobileNetwork = async (
  errorMobileNetworkTitle: string,
  errorMobileNetworkBody: string,
  key: typeNotis
) => {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: errorMobileNetworkTitle,
      body: errorMobileNetworkBody,
      data: { screen: key },
    },
    trigger: null,
  });
  await saveIdentifier(identifier, key);
};
