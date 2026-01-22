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
  return intervalValues?.[reason] ?? -1;
};

const objReasonNotification: Record<ReasonNotification, null> = {
  cryptos: null,
  streamers: null,
  downDetector: null,
  batteryAlerts: null,
  timeToDownload: null,
  locationEnabled: null,
  allNotifications: null,
  recorderNotification: null,
  noInternetConnection: null,
  loggedInStatusChannel: null,
};

export const objByReasonNotification: Notifications["allNotifications"] = {
  behavior: {
    bypassDoNotDisturb: false,
    onlyDuringSpecificHours: {
      enabled: false,
      startHour: 0,
      endHour: 0,
    },
    onlyWhenAppInBackground: false,
    onlyWhenNotInDoNotDisturb: false,
    onlyWhenConnectedToPower: false,
    onlyWhenScreenOff: false,
  },
  enabled: false,
  interval: -1,
  paused: {
    isPaused: false,
    timePaused: 0,
  },
};

export const reasonNotification: ReasonNotification[] = Object.keys(
  objReasonNotification,
) as ReasonNotification[];
