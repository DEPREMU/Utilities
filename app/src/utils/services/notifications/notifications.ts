import {
  ChannelsId,
  Notification,
  Notifications,
  ReasonNotification,
} from "@types";
import {
  Helper,
  Timers,
  REPLACERS,
  ExecuteOnce,
  ServiceClass,
  getNotifications,
} from "@common";
import notify, { Event, EventType } from "react-native-notify-kit";
import { Logger } from "../../TOP_LEVEL";
import { tTyped } from "../../translates";
import { modalRef, navigation } from "@refs";
import { AppState } from "react-native";
import { cloneDeep } from "lodash";
import { PartialDeep, ReadonlyDeep } from "type-fest";
import * as DeviceInfo from "react-native-device-info";
import * as notifications from "expo-notifications";
import { storageManagement } from "../../services/storage";
import { VerifyNotification } from "./verifyNotification";
import { windowModule, NativeFunctionsModule } from "@modules";
import { Actions } from "./actions";

const logger = new Logger("ServicesNotifications");

type SendNotification = (
  notification: Omit<Notification, "id" | "timestamp">,
) => Promise<void>;

if (REPLACERS.isNative)
  ExecuteOnce.execute("configureNotificationChannel", undefined, async () => {
    const channels: Record<ChannelsId, notifications.NotificationChannelInput> =
      {
        updateAvailable: {
          name: tTyped("updates.updateAvailable"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#00ff00",
        },
        cryptos: {
          name: tTyped("notifications.cryptos"),
          importance: notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250, 250, 250, 100],
          lightColor: "#00f7ff7c",
        },
        streamers: {
          name: tTyped("notifications.streamers"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#8400ff7c",
        },
        default: {
          name: tTyped("common.notifications"),
          importance: notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#ffffff",
        },
        locationEnabled: {
          name: tTyped("notifications.LocationServicesEnabled"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#ff0000",
        },
        batteryAlerts: {
          name: tTyped("batteryState.BatteryLow"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#00ff00",
        },
        noInternetConnection: {
          name: tTyped("common.NoInternetConnection"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#ffff00",
        },
        ForegroundServiceChannel: {
          name: tTyped("notifications.foregroundService"),
          importance: notifications.AndroidImportance.LOW,
          sound: null,
          vibrationPattern: null,
        },
        downDetector: {
          name: tTyped("notifications.downDetector"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#ff00ff",
        },
        loggedInStatusChannel: {
          name: tTyped("notifications.loggedInStatusChannel"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#00ffff",
        },
        timeToDownload: {
          name: tTyped("notifications.timeToDownload"),
          importance: notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250, 100],
          lightColor: "#ffa500",
        },
        recorderNotification: {
          name: tTyped("notifications.recorderNotification"),
          importance: notifications.AndroidImportance.LOW,
          sound: null,
          vibrationPattern: null,
        },
      };

    await Promise.all(
      Object.entries(channels).map(([channelId, channelOptions]) =>
        notifications.setNotificationChannelAsync(channelId, channelOptions),
      ),
    );
  });

class NotificationsManager extends ServiceClass<never> {
  #notifications: Notifications = null as unknown as Notifications;

  #notifySent = {} as Record<ReasonNotification, string>;

  #handleNotificationActionEvent = async (event: Event) => {
    const reason = event.detail.notification?.android?.channelId as
      ReasonNotification | undefined;
    if (!reason) return;

    if (event.type === EventType.DISMISSED) {
      await notificationsManager.removeNotification({ reason });
    }

    if (event.type !== EventType.ACTION_PRESS || !event.detail.pressAction)
      return;

    await notificationsManager.removeNotification({ reason });

    const pressAction = event.detail.pressAction;
    switch (pressAction.id as keyof typeof Actions.Actions) {
      case "dismiss":
        // Handle by itself
        break;
      case "pause":
        {
          const input = event.detail.input;
          if (!input) break;

          const timeMinutes = parseInt(input, 10);
          if (isNaN(timeMinutes) || timeMinutes <= 0) break;

          this.pauseNotification(reason, timeMinutes);
        }
        break;
      case "stop":
        this.stopNotification(reason);
        break;
      case "installViaApp":
        await navigation.waitUntilInitialized();
        navigation.navigate("Settings", { installViaApp: true });
        break;
      case "updateNow":
        await navigation.waitUntilInitialized();
        navigation.navigate("Settings", { updateNow: true });
        break;

      default:
        break;
    }
  };

  #setupNotificationHandlers = () => {
    if (REPLACERS.isWeb) return;

    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowList: true,
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    notify.onBackgroundEvent(async (event) => {
      await this.#handleNotificationActionEvent(event);
    });

    notify.onForegroundEvent(async (event) => {
      await this.#handleNotificationActionEvent(event);
    });
  };

  public getNotifications = (): Notifications => {
    return cloneDeep(this.#notifications);
  };

  public getNotification = <T extends ReasonNotification>(
    reason: T,
  ): Notifications[T] => {
    const notificationsData = this.#notifications;
    return cloneDeep(notificationsData[reason]);
  };

  public editNotifications = (
    data:
      | PartialDeep<Notifications>
      | ((prev: ReadonlyDeep<Notifications>) => PartialDeep<Notifications>),
  ): void => {
    const prevData = this.#notifications;

    const newData = Helper.Object.merge(
      prevData,
      typeof data === "function" ? data(prevData) : data,
    );

    this.#notifications = newData;

    storageManagement.save("NOTIFICATIONS", this.#notifications);
  };

  public removeNotification = async (remove: {
    id?: string;
    reason?: ReasonNotification;
  }) => {
    if (REPLACERS.isWeb) return;

    if (remove.id) await notify.cancelDisplayedNotification(remove.id);

    if (remove.reason) {
      const id = this.#notifySent[remove.reason];
      delete this.#notifySent[remove.reason];
      if (id) await notify.cancelDisplayedNotification(id);
    }
  };

  private isNotificationPaused<T extends ReasonNotification>(
    notification: Notifications[T],
    reasonNotification: ReasonNotification,
  ): boolean {
    if (reasonNotification !== "streamers" && notification.paused.isPaused) {
      const timePaused = notification.paused.timePaused || 0;
      if (Date.now() < timePaused) return true;

      this.editNotifications({
        [reasonNotification]: {
          paused: {
            isPaused: false,
            timePaused: -1,
          },
        },
      });
    }

    return false;
  }

  private stopNotification<T extends ReasonNotification>(reason: T) {
    this.editNotifications({ [reason]: { enabled: false } });
  }

  private pauseNotification<T extends ReasonNotification>(
    reason: T,
    time: number,
  ) {
    this.editNotifications({
      [reason]: {
        paused: { isPaused: true, timePaused: Date.now() + time * 60 * 1000 },
      },
    });
  }

  public async sendSnackBarNotify<T extends ReasonNotification>(
    notification: Notifications[T],
    message: string,
  ) {
    if (
      storageManagement.hasUI &&
      !notification.behavior.onlyWhen.screenOff &&
      !notification.behavior.onlyWhen.appInBackground &&
      (REPLACERS.isNative
        ? !notification.behavior.onlyWhen.connectedToPower ||
          (await DeviceInfo.isBatteryCharging())
        : true)
    )
      modalRef.openSnackBar?.(message, 8000);
  }

  public sendNotification: SendNotification = async (notification) => {
    await storageManagement.waitUntilInitialized();
    const localNotification = this.getNotification(
      notification.reasonNotification,
    );

    if (!localNotification.enabled) return;

    if (
      this.isNotificationPaused(
        localNotification,
        notification.reasonNotification,
      )
    )
      return;

    if (AppState.currentState === "active") {
      this.sendSnackBarNotify(
        localNotification,
        [notification.title, notification.message].join("\n"),
      );

      return;
    }

    const verify = await VerifyNotification.create(localNotification);

    if (verify.specificHours()) return;

    if (REPLACERS.isWeb) {
      windowModule.notification.send({
        body: notification.message,
        title: notification.title,
        actions: notification.actions?.map((action) => ({
          type: "button",
          text: action.title,
        })),
        closeButtonText: tTyped("common.close"),
        reasonNotification: notification.reasonNotification,
      });

      return;
    } else {
      try {
        const isDND = await NativeFunctionsModule.isDoNotDisturbEnabled();

        if (verify.screenOff()) return;

        if (
          verify.aggressive(!!this.#notifySent[notification.reasonNotification])
        )
          return;

        if (verify.notInDND(isDND)) return;

        if (verify.appInBackground()) return;

        if (await verify.connectedToPower()) return;

        if (verify.bypassDND(isDND)) {
          const result = await NativeFunctionsModule.disableDoNotDisturb();
          if (result === "PERMISSION_REQUIRED")
            this.editNotifications({
              [notification.reasonNotification]: {
                behavior: { bypassDoNotDisturb: false },
              },
            });
        }

        await this.removeNotification({
          reason: notification.reasonNotification,
        });

        const { title, message, actions, data, channelId } = notification;
        const notificationId = await notify.displayNotification({
          data,
          title,
          body: message,
          android: { actions, channelId },
        });

        this.#notifySent[notification.reasonNotification] = notificationId;

        if (verify.bypassDND(isDND))
          Timers.setTimeout(
            () => NativeFunctionsModule.enableDoNotDisturb(),
            1500,
          );
      } catch (error) {
        logger.error("Error sending native notification", error);
      }
    }
  };

  override async _init(): Promise<void> {
    this.#setupNotificationHandlers();

    const notificationsData = await ExecuteOnce.execute(
      "initializeNotificationsStorage",
      undefined,
      async (): Promise<Notifications> => {
        await storageManagement.waitUntilInitialized();
        const notificationsData = storageManagement.get("NOTIFICATIONS");

        const newNotifications = getNotifications();

        if (Helper.Object.isEqualObj(newNotifications, notificationsData))
          return notificationsData;

        const { status } = await notifications.requestPermissionsAsync();
        newNotifications.allNotifications.enabled =
          status === notifications.PermissionStatus.GRANTED;

        storageManagement.save("NOTIFICATIONS", newNotifications);
        return newNotifications;
      },
    );
    this.#notifications = notificationsData;
  }

  public toggleNotification = async <T extends ReasonNotification>(
    reason: T,
  ) => {
    const { deviceInfo, EventsDeviceInfo } = await import("../deviceInfo");

    await deviceInfo.waitUntilInitialized();

    this.editNotifications({
      [reason]: { enabled: !this.#notifications[reason].enabled },
    });

    const getListenerNameDeviceInfo = (reason: ReasonNotification) => {
      switch (reason) {
        case "locationEnabled":
          return EventsDeviceInfo.verifyLocation;
        case "batteryAlerts":
          return EventsDeviceInfo.batteryAlerts;
        case "noInternetConnection":
          return EventsDeviceInfo.hasInternetChange;
        default:
          return null;
      }
    };

    const event = getListenerNameDeviceInfo(reason);
    if (!event) return;

    if (this.getNotification(reason).enabled)
      await deviceInfo.initListener(event);
    else deviceInfo.removeListener(event);
  };

  override destroy() {
    super.destroy();
  }

  constructor() {
    super();
    this._reInit();
  }
}

export const notificationsManager = new NotificationsManager();
