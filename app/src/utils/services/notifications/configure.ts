import notify, {
  AndroidChannel,
  AndroidImportance,
} from "react-native-notify-kit";
import { tTyped } from "@/utils/translates";
import { ChannelsId } from "@types";
import { ExecuteOnce } from "@common";

ExecuteOnce.execute("configureNotificationChannel", undefined, async () => {
  const allNotifications = await notify.getChannel(
    "ForegroundServiceChannel" satisfies ChannelsId,
  );
  if (allNotifications) {
    if (allNotifications.name === tTyped("notifications.foregroundService"))
      return;
  }

  const channels = {
    updateAvailable: {
      id: "updateAvailable",
      name: tTyped("updates.updateAvailable"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#00ff00",
    },
    cryptos: {
      id: "cryptos",
      name: tTyped("notifications.cryptos"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 250, 250, 100],
      lightColor: "#00f7ff7c",
    },
    streamers: {
      id: "streamers",
      name: tTyped("notifications.streamers"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#8400ff7c",
    },
    default: {
      id: "default",
      name: tTyped("common.notifications"),
      importance: AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffffff",
    },
    locationEnabled: {
      id: "locationEnabled",
      name: tTyped("notifications.LocationServicesEnabled"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ff0000",
    },
    batteryAlerts: {
      id: "batteryAlerts",
      name: tTyped("batteryState.BatteryLow"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#00ff00",
    },
    noInternetConnection: {
      id: "noInternetConnection",
      name: tTyped("common.NoInternetConnection"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffff00",
    },
    ForegroundServiceChannel: {
      id: "ForegroundServiceChannel",
      name: tTyped("notifications.foregroundService"),
      importance: AndroidImportance.LOW,
    },
    downDetector: {
      id: "downDetector",
      name: tTyped("notifications.downDetector"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ff00ff",
    },
    loggedInStatusChannel: {
      id: "loggedInStatusChannel",
      name: tTyped("notifications.loggedInStatusChannel"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#00ffff",
    },
    timeToDownload: {
      id: "timeToDownload",
      name: tTyped("notifications.timeToDownload"),
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffa500",
    },
    recorderNotification: {
      id: "recorderNotification",
      name: tTyped("notifications.recorderNotification"),
      importance: AndroidImportance.LOW,
    },
  } as const satisfies Record<ChannelsId, AndroidChannel & { id: ChannelsId }>;

  await notify.createChannels(Object.values(channels));
});
