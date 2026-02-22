import {
  BackgroundModule,
  NotificationModule,
  NativeFunctionsModule,
} from "@modules";
import {
  ScreensAvailable,
  EventNativeModule,
  NotificationAction,
  ReasonNotification,
} from "@types";
import {
  logger,
  isLocationEnabled,
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "../functions";
import { tTyped } from "../translates";
import { REPLACERS } from "../TOP_LEVEL";
import * as Location from "expo-location";
import { DATA_PLATFORM } from "../cross";
import * as DeviceInfoRN from "react-native-device-info";
import { storageManagement } from "./storage";
import { notificationsManager } from "./notifications";
import { navigateReplace, navigationRef } from "@refs";
import { AppState, AppStateStatus, DeviceEventEmitter } from "react-native";

export type typeDataReceivedState = { state: "suspended" | "resumed" };

export type typeDeviceInfo = {
  statePhone: typeDataReceivedState["state"];
  hasInternet: boolean;
  isBackground: boolean;
};

type ArgsListenersDeviceInfo = {
  screenChange: [prevScreen: ScreensAvailable, newScreen: ScreensAvailable];
  queryAppState: [];
  batteryAlerts: [];
  verifyLocation: [];
  "appState-change": [newState: AppStateStatus];
  "statePhone-change": [newState: typeDataReceivedState["state"]];
  "hasInternet-change": [newState: boolean];
  "isBackground-change": [newState: boolean];
  "notification-action": [action: EventNativeModule];
};

type EventKeys = keyof ArgsListenersDeviceInfo;

type AddEventListener = <T extends keyof ListenersDeviceInfo>(
  event: T,
  callback: (...args: ArgsListenersDeviceInfo[T]) => void,
) => () => void;

type RemoveEventListener = <T extends keyof ListenersDeviceInfo>(
  event: T,
  callback: (...args: ArgsListenersDeviceInfo[T]) => void,
) => void;

type ListenersDeviceInfo = {
  [event in keyof ArgsListenersDeviceInfo]?: Record<
    string,
    (...args: ArgsListenersDeviceInfo[event]) => void
  >;
};

type EmitEvent = <T extends keyof ListenersDeviceInfo>(
  event: T,
  ...args: ArgsListenersDeviceInfo[T]
) => void;

const verifyLocation = async () => {
  const { status } = await Location.getBackgroundPermissionsAsync();
  const hasPermission = status === "granted";
  if (!hasPermission) return;

  const locationEnabled = await isLocationEnabled();
  if (!locationEnabled) return;

  notificationsManager.sendNotification({
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

class DeviceInfo {
  #i = 0;

  #initialized = false;
  #initPromise: Promise<void> | null = null;

  #cleanup = () => {
    Object.values(this.#listeners).forEach((cleanup) => cleanup?.());
    this.#listeners = {};
  };

  #listeners: Partial<Record<keyof ListenersDeviceInfo, () => void>> = {};

  public statePhone: typeDataReceivedState["state"] = "resumed";
  public hasInternet = true;
  public isBackground = false;

  public addEventListener: AddEventListener = (event, callback) => {
    const id = `${this.#i++}`;
    if (!this._listeners[event]) this._listeners[event] = {};
    this._listeners[event][id] = callback;

    return () => {
      delete this._listeners[event]?.[id];
    };
  };

  public removeEventListener: RemoveEventListener = (event, callback) => {
    const listeners = this._listeners[event];
    if (!listeners) return;

    const entry = Object.entries(listeners).find(([, cb]) => cb === callback);
    if (!entry) return;

    const [id] = entry;
    delete this._listeners[event]?.[id];
  };

  public removeAllListeners = (event?: keyof ListenersDeviceInfo) => {
    if (event) {
      delete this._listeners[event];
    } else {
      this._listeners = {};
    }
  };

  private _listeners: ListenersDeviceInfo = {};

  private _emitEvent: EmitEvent = (event, ...args) => {
    const listeners = this._listeners[event];
    if (!listeners) return;

    Object.values(listeners).forEach((callback) => callback?.(...args));
  };

  private _initAppState = () => {
    const event: EventKeys = "appState-change";

    this.#listeners[event]?.();
    delete this.#listeners[event];

    const appStateListener = AppState.addEventListener(
      "change",
      (nextState) => {
        if (this.isBackground === (nextState !== "active")) return;

        this.isBackground = nextState !== "active";
        this._emitEvent("isBackground-change", this.isBackground);
      },
    );
    this.#listeners[event] = () => appStateListener.remove();
  };

  private _initHasInternet = async () => {
    const event: EventKeys = "hasInternet-change";

    this.#listeners[event]?.();
    delete this.#listeners[event];

    await notificationsManager.waitUntilLoaded();
    const notification = notificationsManager.getNotification(
      "noInternetConnection",
    );
    if (!notification.enabled) return;

    const hasInternetId = setIntervalPolyfill(
      async () => {
        if (REPLACERS.isNative)
          NotificationModule.cancelPreviousReasonNotification(
            "noInternetConnection",
          );

        const { hasInternetConnection } = await import("@utils");

        const hasInternet = await hasInternetConnection();
        if (this.hasInternet === hasInternet) return;

        if (this.hasInternet && !hasInternet) {
          notificationsManager.sendNotification({
            type: "warning",
            title: tTyped("common.NoInternetConnection"),
            message: tTyped("common.PleaseCheckInternetConnection"),
            channelId: "noInternetConnection",
            reasonNotification: "noInternetConnection",
            overrideNotification: false,
          });
        } else {
          notificationsManager.sendNotification({
            type: "success",
            title: tTyped("InternetConnectionRestored"),
            message: tTyped("YouAreBackOnline"),
            channelId: "noInternetConnection",
            reasonNotification: "noInternetConnection",
            overrideNotification: false,
          });
        }

        this.hasInternet = hasInternet;
        this._emitEvent("hasInternet-change", this.hasInternet);
      },
      REPLACERS.isNative ? 8000 : 5000,
    );

    this.#listeners[event] = () => {
      clearIntervalPolyfill(hasInternetId);
    };
  };

  private _initStatePhone = () => {
    if (!REPLACERS.isNative) return;

    const event: EventKeys = "statePhone-change";

    this.#listeners[event]?.();
    delete this.#listeners[event];

    const statePhoneListener = DeviceEventEmitter.addListener(
      "onUpdateSuspendResume",
      (data: typeDataReceivedState) => {
        if (data.state === this.statePhone) return;

        this.statePhone = data.state || "resumed";
        this._emitEvent("statePhone-change", this.statePhone);
      },
    );
    this.#listeners[event] = () => statePhoneListener.remove();
  };

  private _initQueryAppState = () => {
    if (!REPLACERS.isNative) return;

    const event: EventKeys = "queryAppState";

    this.#listeners[event]?.();
    delete this.#listeners[event];

    const queryAppStateListener = DeviceEventEmitter.addListener(
      "queryAppState",
      () => {
        BackgroundModule.setReactAlive(true);
      },
    );

    this.#listeners[event] = () => queryAppStateListener.remove();
  };

  private _initNotificationEvents = () => {
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

              if (event.reasonNotification === "recorderNotification") {
                const { recorderManager } = await import("./recorder");
                await recorderManager.stopRecording({
                  keepService: true,
                  silent: true,
                });
              }

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

    this.#listeners["notification-action"] = () => subscription.remove();
  };

  private _initVerifyLocation = async () => {
    const event: EventKeys = "verifyLocation";

    this.#listeners[event]?.();
    delete this.#listeners[event];

    await notificationsManager.waitUntilLoaded();
    const notification =
      notificationsManager.getNotification("locationEnabled");
    if (!notification.enabled) return;

    const id = setIntervalPolyfill(verifyLocation, 15000);
    this.#listeners[event] = () => clearIntervalPolyfill(id);
  };

  private _initBatteryAlerts = async () => {
    const event: EventKeys = "batteryAlerts";

    this.#listeners[event]?.();
    delete this.#listeners[event];
    const reasonNotification: ReasonNotification = event;

    await notificationsManager.waitUntilLoaded();
    const notification =
      notificationsManager.getNotification(reasonNotification);
    if (!notification.enabled) return;

    const handleBatteryNotifications = async () => {
      const actions: NotificationAction[] = [
        { actionId: "dismiss", title: tTyped("dismiss"), icon: "delete" },
      ];

      if (REPLACERS.isNative) {
        if (await NativeFunctionsModule.checkOverlayPermission()) {
          actions.push({
            actionId: "pause",
            title: tTyped("pause"),
            icon: "pause",
          });
        }
        NotificationModule.cancelPreviousReasonNotification(reasonNotification);
      }
      const powerState = await DeviceInfoRN.getPowerState();
      const batteryLevel = powerState.batteryLevel || 0;
      const batteryState = powerState.batteryState || "unknown";

      if (batteryState === "charging" || batteryState === "full") {
        if (batteryLevel <= 0.8) return;

        notificationsManager.sendNotification({
          title: tTyped("BatteryFullyCharged"),
          message: tTyped("YouCanUnplugYourDevice"),
          type: "info",
          channelId: "batteryAlerts",
          reasonNotification,
          actions,
          overrideNotification: false,
        });
        return;
      } else if (batteryLevel >= 0.3) return;

      notificationsManager.sendNotification({
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

    const id = setIntervalPolyfill(handleBatteryNotifications, 10000);
    if (REPLACERS.isWeb && !DATA_PLATFORM.hasBattery) clearIntervalPolyfill(id);
    else {
      this.#listeners[event] = () => clearIntervalPolyfill(id);
    }
  };

  private _initScreenChange = async () => {
    await storageManagement.waitUntilLoaded();
    if (!storageManagement.hasUI) return;

    const event: EventKeys = "screenChange";
    let prevScreen: ScreensAvailable = "Home";

    const remover = navigationRef.current?.addListener("state", () => {
      const route = navigationRef.current?.getCurrentRoute();
      const screen = route?.name || "Home";
      if (screen === prevScreen) return;

      this._emitEvent("screenChange", prevScreen, screen);
      prevScreen = screen;
    });
    this.#listeners[event] = () => remover?.();
  };

  public waitUntilLoaded = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;
    return this._init();
  };

  private _init = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    const init = async () => {
      this.#cleanup();

      this._initAppState();

      if (REPLACERS.isNative) {
        this._initStatePhone();
        this._initQueryAppState();
        this._initNotificationEvents();
      }

      await Promise.all([
        this._initHasInternet(),
        this._initScreenChange(),
        this._initBatteryAlerts(),
        this._initVerifyLocation(),
      ]);
      this.#initialized = true;
      this.#initPromise = null;
    };

    this.#initPromise = init();

    return this.#initPromise;
  };

  constructor() {
    this._init();
  }
}

export const deviceInfo = new DeviceInfo();
