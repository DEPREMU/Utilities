import {
  windowModule,
  NotificationModule,
  NativeFunctionsModule,
} from "@modules";
import {
  Notification,
  EventNativeModule,
  ReasonNotification,
  NotificationAction,
} from "@types";
import React, {
  useRef,
  useMemo,
  useEffect,
  ReactNode,
  useContext,
  createContext,
} from "react";
import {
  tTyped,
  logger,
  REPLACERS,
  DATA_PLATFORM,
  isLocationEnabled,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
  notificationsManager,
} from "@utils";
import DeviceInfo from "react-native-device-info";
import { useModal } from "./ModalContext";
import * as Location from "expo-location";
import { useLanguage } from "./LanguageContext";
import { useBackground } from "./BackgroundContext";
import { useUserContext } from "./UserContext";
import * as Notifications from "expo-notifications";
import { navigateReplace } from "@/app/refs/navigationRef";
import { DeviceEventEmitter } from "react-native";
import { useDeviceInformation } from "./DeviceInformationContext";

type SendNotification = (
  notification: Omit<Notification, "id" | "timestamp">,
) => Promise<string | undefined>;

interface NotificationsContextType {
  sendNotificationRef: React.RefObject<SendNotification>;
  removeNotificationRef: React.RefObject<
    (id: number, reasonNotification: ReasonNotification) => void
  >;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({
  children,
}) => {
  const { t } = useLanguage();
  const { statesRef } = useBackground();
  const { isLoggedIn } = useUserContext();
  const { deviceInfo } = useDeviceInformation();
  const { openSnackBarRef } = useModal();
  const { hasInternet, initIntervalTimeoutsRef, deleteIntervalTimeoutRef } =
    useBackground();

  const prevHasInternet = useRef<boolean | null>(null);

  const sendNotificationRef = useRef(
    async (notification: Omit<Notification, "id" | "timestamp">) => {
      try {
        const localNotification = notificationsManager.getNotification(
          notification.reasonNotification,
        );

        if (!localNotification?.enabled) return;

        if (
          notification.reasonNotification !== "streamers" &&
          localNotification?.paused
        ) {
          const timePaused = localNotification?.paused.timePaused || 0;
          if (Date.now() < timePaused) return;

          notificationsManager.editNotification(
            notification.reasonNotification,
            (prev) => {
              return {
                ...prev,
                paused: {
                  isPaused: false,
                  timePaused: -1,
                },
              };
            },
          );
        }

        if (!statesRef.current.isBackground) {
          if (
            !localNotification.behavior.onlyWhenScreenOff &&
            !localNotification.behavior.onlyWhenAppInBackground
          )
            openSnackBarRef.current(
              [notification.title, notification.message].join("\n"),
              8000,
            );

          return;
        }

        if (localNotification.behavior.onlyDuringSpecificHours.enabled) {
          const currentHour = new Date().getHours();
          const { startHour, endHour } =
            localNotification.behavior.onlyDuringSpecificHours;

          if (currentHour < startHour || currentHour >= endHour) return;
        }

        if (REPLACERS.isWeb) {
          windowModule.sendNotification({
            body: notification.message,
            title: notification.title,
            actions: notification.actions?.map((action) => ({
              type: "button",
              text: action.title,
            })),
            closeButtonText: t("common.close"),
            reasonNotification: notification.reasonNotification,
          });

          return;
        } else {
          try {
            const isDND = await NativeFunctionsModule.isDoNotDisturbEnabled();

            if (
              localNotification.behavior.onlyWhenScreenOff &&
              statesRef.current.statePhone !== "resumed"
            ) {
              return;
            } else if (localNotification.behavior.onlyWhenConnectedToPower) {
              const isCharging = await DeviceInfo.isBatteryCharging();
              if (!isCharging) return;
            } else if (
              localNotification.behavior.onlyWhenNotInDoNotDisturb &&
              isDND
            ) {
              return;
            } else if (localNotification.behavior.bypassDoNotDisturb) {
              await NativeFunctionsModule.disableDoNotDisturb();
            }

            const notificationId = Math.floor(Math.random() * 1000000);

            await NotificationModule.sendNotification(
              notificationId,
              notification.title,
              notification.message,
              notification.channelId,
              notification.reasonNotification,
              true,
              notification.data || {},
              notification.actions || null,
            );

            if (isDND && localNotification.behavior.bypassDoNotDisturb) {
              await NativeFunctionsModule.enableDoNotDisturb();
            }

            return String(notificationId);
          } catch (error) {
            logger.error("Error sending native notification", error);
          }
        }

        return await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            data: { type: notification.type, ...notification.data },
          },
          trigger: notification.trigger || null,
        });
      } catch (error) {
        logger.error(
          "NOTIFICATIONS",
          "Error checking paused notifications",
          error,
        );
      }
    },
  );

  const removeNotificationRef = useRef(
    (id: number, reasonNotification: ReasonNotification) => {
      if (REPLACERS.isWeb) return;

      try {
        NotificationModule.cancelNotification(id, reasonNotification);
      } catch (error) {
        logger.error("Error canceling native notification", error);
      }
      Notifications.cancelScheduledNotificationAsync(String(id));
    },
  );

  useEffect(() => {
    if (!REPLACERS.isNative) return;

    const subscription = DeviceEventEmitter.addListener(
      "onNotificationAction",
      async (event: EventNativeModule) => {
        switch (event.actionId) {
          case "dismiss":
            // Handled below
            break;
          case "settings":
            navigateReplace("Settings");
            break;
          case "pause":
            try {
              const getTimeWithReason = (reason: ReasonNotification) => {
                const defaultTimes: Record<ReasonNotification, number> = {
                  cryptos: 30,
                  streamers: 30,
                  downDetector: 15,
                  batteryAlerts: 30,
                  timeToDownload: 1,
                  locationEnabled: 30,
                  allNotifications: 60,
                  noInternetConnection: 15,
                  recorderNotification: 30,
                  loggedInStatusChannel: 15,
                };

                return (defaultTimes[reason] || 60) * 60 * 1000;
              };

              if (event.reasonNotification === "streamers") break;

              notificationsManager.editNotification(
                event.reasonNotification,
                (prev) => ({
                  ...prev,
                  paused: {
                    ...prev.paused,
                    isPaused: true,
                    timePaused:
                      Date.now() + getTimeWithReason(event.reasonNotification),
                  },
                }),
              );
            } catch (error) {
              logger.error("Error pausing notifications", error);
            }
            break;
          case "stop":
            {
              if (event.reasonNotification === "streamers") break;

              notificationsManager.editNotification(
                event.reasonNotification,
                (prev) => ({
                  ...prev,
                  enabled: false,
                }),
              );
            }
            break;
          default:
            break;
        }
        NotificationModule.cancelNotification(
          event.notificationId,
          event.reasonNotification,
        );
      },
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isLoggedIn || !hasInternet) return;

    const id = setTimeoutPolyfill(async () => {
      const actions: NotificationAction[] = [
        { actionId: "dismiss", title: tTyped("dismiss"), icon: "delete" },
        { actionId: "stop", title: tTyped("stop"), icon: "stop" },
      ];
      if (await NativeFunctionsModule.checkOverlayPermission()) {
        actions.push({
          actionId: "pause",
          title: tTyped("pause"),
          icon: "pause",
        });
      }

      sendNotificationRef.current({
        type: "info",
        title: tTyped("youAreNotLoggedIn"),
        actions,
        message: tTyped("youAreNotLoggedInMessage"),
        channelId: "loggedInStatusChannel",
        reasonNotification: "loggedInStatusChannel",
        overrideNotification: false,
      });
    }, 30000);

    return () => clearTimeoutPolyfill(id);
  }, [isLoggedIn, hasInternet]);

  useEffect(() => {
    if (!deviceInfo?.powerState) return;

    const reasonNotification: ReasonNotification = "batteryAlerts";

    const handleBatteryNotifications = async () => {
      const actions: NotificationAction[] = [
        { actionId: "dismiss", title: tTyped("dismiss"), icon: "delete" },
      ];

      if (await NativeFunctionsModule.checkOverlayPermission()) {
        actions.push({
          actionId: "pause",
          title: tTyped("pause"),
          icon: "pause",
        });
      }
      if (REPLACERS.isNative) {
        NotificationModule.cancelPreviousReasonNotification(reasonNotification);
      }

      if (["charging", "full"].includes(deviceInfo?.powerState?.batteryState)) {
        if (deviceInfo.powerState.batteryLevel <= 0.8) return;

        await sendNotificationRef.current({
          title: tTyped("BatteryFullyCharged"),
          message: tTyped("YouCanUnplugYourDevice"),
          type: "info",
          channelId: "batteryAlerts",
          reasonNotification,
          actions,
          overrideNotification: false,
        });
        return;
      } else if (
        deviceInfo?.powerState?.batteryLevel >= 0.3 &&
        ["unplugged", "unknown"].includes(deviceInfo?.powerState?.batteryState)
      )
        return;

      await sendNotificationRef.current({
        title: tTyped("BatteryLow"),
        message: tTyped("YourBatteryIsLow"),
        type: "warning",
        channelId: "batteryAlerts",
        overrideNotification: false,
        reasonNotification,
        actions: [
          ...actions,
          { actionId: "stop", title: tTyped("stop"), icon: "stop" },
        ],
      });
    };

    const id = setTimeoutPolyfill(handleBatteryNotifications, 5000);
    if (REPLACERS.isWeb && !DATA_PLATFORM.hasBattery) clearTimeoutPolyfill(id);
    return () => clearTimeoutPolyfill(id);
  }, [deviceInfo?.powerState]);

  useEffect(() => {
    if (REPLACERS.isNative)
      NotificationModule.cancelPreviousReasonNotification(
        "noInternetConnection",
      );

    if (prevHasInternet.current === null) {
      prevHasInternet.current = hasInternet;
      return;
    }
    if (hasInternet === prevHasInternet.current) return;

    if (!hasInternet && prevHasInternet.current) {
      sendNotificationRef.current({
        title: tTyped("common.NoInternetConnection"),
        message: tTyped("common.PleaseCheckInternetConnection"),
        type: "error",
        overrideNotification: false,
        channelId: "noInternetConnection",
        reasonNotification: "noInternetConnection",
      });
    } else {
      sendNotificationRef.current({
        title: tTyped("InternetConnectionRestored"),
        message: tTyped("YouAreBackOnline"),
        type: "success",
        channelId: "noInternetConnection",
        reasonNotification: "noInternetConnection",
        overrideNotification: false,
      });
    }

    if (prevHasInternet.current !== hasInternet)
      prevHasInternet.current = hasInternet;
  }, [hasInternet]);

  useEffect(() => {
    if (REPLACERS.isWeb) return;

    const verifyLocation = async () => {
      const { status } = await Location.getBackgroundPermissionsAsync();
      const hasPermission = status === "granted";
      if (!hasPermission) return;

      const locationEnabled = await isLocationEnabled();
      if (!locationEnabled) return;

      sendNotificationRef.current({
        title: tTyped("LocationServicesEnabled"),
        message: tTyped("LocationServicesEnabledMessage"),
        type: "info",
        channelId: "locationEnabled",
        reasonNotification: "locationEnabled",
        overrideNotification: false,
        actions: [
          {
            actionId: "dismiss",
            title: tTyped("dismiss"),
            icon: "delete",
          },
          {
            actionId: "pause",
            title: tTyped("pause"),
            icon: "pause",
          },
        ],
      });
    };

    initIntervalTimeoutsRef.current("locationEnabled", {
      fn: verifyLocation,
      type: "interval",
      interval: 60000,
      workWithInternet: false,
      shouldRestartAuto: true,
      shouldStopWhenSuspend: false,
    });

    verifyLocation();

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      deleteIntervalTimeoutRef.current("locationEnabled");
    };
  }, [initIntervalTimeoutsRef, deleteIntervalTimeoutRef]);

  const value: NotificationsContextType = useMemo(
    () => ({
      sendNotificationRef,
      removeNotificationRef,
    }),
    [],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
};
