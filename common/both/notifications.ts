import { Helper } from "./helpers";
import { Notifications, ReasonNotification } from "@types";

export const intervalValues: Record<ReasonNotification, number> = {
  cryptos: 0,
  streamers: -1,
  downDetector: -1,
  batteryAlerts: -1,
  timeToDownload: -1,
  locationEnabled: -1,
  updateAvailable: -1,
  allNotifications: -1,
  noInternetConnection: -1,
  recorderNotification: -1,
  loggedInStatusChannel: -1,
};

export const getAllNotifications = (): Notifications["allNotifications"] => {
  return {
    enabled: false,
    paused: {
      isPaused: false,
      timePaused: 0,
    },
    behavior: {
      aggressive: false,
      bypassDoNotDisturb: false,
      onlyWhen: {
        screenOff: false,
        appInBackground: false,
        connectedToPower: false,
        notInDoNotDisturb: false,
        specificHours: {
          enabled: false,
          endHour: 0,
          startHour: 0,
        },
      },
    },
  };
};

export const reasonNotification: ReasonNotification[] = Object.keys(
  intervalValues,
) as ReasonNotification[];

export const getNotifications = (): Notifications => {
  const notifications: Notifications = Helper.Object.fromEntries(
    reasonNotification.map((key) => {
      switch (key) {
        case "cryptos":
        case "downDetector":
        case "timeToDownload":
        case "updateAvailable":
        case "allNotifications":
        case "recorderNotification":
        case "loggedInStatusChannel":
          return [
            key,
            getAllNotifications() satisfies Notifications[typeof key],
          ];

        case "locationEnabled": {
          const notifications = getAllNotifications();
          notifications.behavior.aggressive = true;
          return [key, notifications satisfies Notifications[typeof key]];
        }

        case "noInternetConnection": {
          const notifications = getAllNotifications();

          return [
            key,
            {
              ...notifications,
              behavior: {
                ...notifications.behavior,
                doubleCheck: true,
              },
            } satisfies Notifications[typeof key],
          ];
        }

        case "batteryAlerts": {
          const notifications = getAllNotifications();

          return [
            key,
            {
              ...notifications,
              behavior: {
                ...notifications.behavior,
                batteryLevel: {
                  min: 30,
                  max: 80,
                },
              },
            } satisfies Notifications[typeof key],
          ];
        }

        case "streamers":
          return [
            key,
            {
              ...getAllNotifications(),
              streamersList: [],
            } satisfies Notifications[typeof key],
          ];
        default:
          throw new Error(
            `Reason "${key}" is not included in getNotifications`,
          );
      }
    }),
  );

  return notifications;
};
