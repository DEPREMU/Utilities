import { Notifications, ReasonNotification } from "@types";

export const intervalValues: Record<ReasonNotification, number> = {
  cryptos: 0,
  streamers: -1,
  downDetector: -1,
  batteryAlerts: -1,
  timeToDownload: -1,
  locationEnabled: -1,
  allNotifications: -1,
  noInternetConnection: -1,
  recorderNotification: -1,
  loggedInStatusChannel: -1,
};

export const getDefaultMinutes = (reason: ReasonNotification): number => {
  return intervalValues[reason] ?? -1;
};

export const objByReasonNotification: Notifications["allNotifications"] = {
  enabled: false,
  interval: -1,
  paused: {
    isPaused: false,
    timePaused: 0,
  },
  behavior: {
    bypassDoNotDisturb: false,
    onlyWhenScreenOff: false,
    onlyWhenAppInBackground: false,
    onlyWhenConnectedToPower: false,
    onlyWhenNotInDoNotDisturb: false,
    onlyDuringSpecificHours: {
      enabled: false,
      endHour: 0,
      startHour: 0,
    },
  },
};

export const reasonNotification: ReasonNotification[] = Object.keys(
  intervalValues,
) as ReasonNotification[];
