import { ReasonNotification } from "@types";

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

export const reasonNotification: ReasonNotification[] = Object.keys(
  objReasonNotification,
) as ReasonNotification[];
