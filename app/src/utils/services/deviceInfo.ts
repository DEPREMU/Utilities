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
import * as NetInfo from "@react-native-community/netinfo";
import { tTyped } from "../translates";
import { REPLACERS } from "../TOP_LEVEL";
import * as Location from "expo-location";
import { DATA_PLATFORM } from "../cross";
import * as DeviceInfoRN from "react-native-device-info";
import { storageManagement } from "./storage";
import { ExpectedSecureStorageTypes } from "@common";
import { navigateReplace, navigationRef } from "@refs";
import { AppState, AppStateStatus, DeviceEventEmitter } from "react-native";

export type typeDataReceivedState = { state: "suspended" | "resumed" };

export type NetworkInfo = {
  type: NetInfo.NetInfoStateType;
  isCellular: boolean;
} & ExpectedSecureStorageTypes["NETWORK_SETTINGS"];

export type typeDeviceInfo = {
  statePhone: typeDataReceivedState["state"];
  hasInternet: boolean;
  isBackground: boolean;
  networkInfo: NetworkInfo;
};

export enum EventsDeviceInfo {
  screenChange = "screen-change",
  batteryAlerts = "batteryAlerts",
  queryAppState = "queryAppState-change",
  verifyLocation = "verifyLocation",
  appStateChange = "appState-change",
  statePhoneChange = "statePhone-change",
  hasInternetChange = "hasInternet-change",
  networkTypeChange = "networkType-change",
  notificationAction = "notification-action",
  isBackgroundChange = "isBackground-change",
}

type ArgsListenersDeviceInfo = {
  [EventsDeviceInfo.screenChange]: [
    prevScreen: ScreensAvailable,
    newScreen: ScreensAvailable,
  ];
  [EventsDeviceInfo.queryAppState]: [];
  [EventsDeviceInfo.batteryAlerts]: [];
  [EventsDeviceInfo.verifyLocation]: [];
  [EventsDeviceInfo.appStateChange]: [newState: AppStateStatus];
  [EventsDeviceInfo.statePhoneChange]: [
    newState: typeDataReceivedState["state"],
  ];
  [EventsDeviceInfo.hasInternetChange]: [newState: boolean];
  [EventsDeviceInfo.isBackgroundChange]: [newState: boolean];
  [EventsDeviceInfo.notificationAction]: [action: EventNativeModule];
  [EventsDeviceInfo.networkTypeChange]: [type: NetInfo.NetInfoStateType];
};

type AddEventListener = <T extends EventsDeviceInfo>(
  event: T,
  callback: (...args: ArgsListenersDeviceInfo[T]) => void,
) => () => void;

type RemoveEventListener = <T extends keyof ListenersDeviceInfo>(
  event: T,
  callback: (...args: ArgsListenersDeviceInfo[T]) => void,
) => void;

type ListenersDeviceInfo = {
  [event in EventsDeviceInfo]?: Record<
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

  const { notificationsManager } = await import("@utils");

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

  #data: typeDeviceInfo = {
    statePhone: "resumed",
    hasInternet: true,
    isBackground: false,
    networkInfo: {
      type: NetInfo.NetInfoStateType.unknown,
      isCellular: false,
      fetchWithCellularData: false,
    },
  };

  public get hasInternet() {
    return this.#data.hasInternet;
  }

  public get statePhone() {
    return this.#data.statePhone;
  }

  public get isBackground() {
    return this.#data.isBackground;
  }

  public get fetchNetworkInfo() {
    return this.#data.networkInfo;
  }

  public setFetchWithCellularData(value?: boolean) {
    this.#data.networkInfo.fetchWithCellularData =
      value ?? !this.#data.networkInfo.fetchWithCellularData;
  }

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
    const event = EventsDeviceInfo.appStateChange;
    if (this.#listeners[event]) return;

    const appStateListener = AppState.addEventListener(
      "change",
      (nextState) => {
        const newIsBackground = nextState !== "active";

        if (this.isBackground === newIsBackground) return;

        this.#data.isBackground = newIsBackground;
        this._emitEvent(EventsDeviceInfo.isBackgroundChange, this.isBackground);
      },
    );
    this.#listeners[event] = () => appStateListener.remove();
  };

  private _initHasInternet = async () => {
    const event = EventsDeviceInfo.hasInternetChange;
    if (this.#listeners[event]) return;

    const { notificationsManager, hasInternetConnection } =
      await import("@utils");

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

        const info = this.fetchNetworkInfo;

        const hasInternet =
          (info.isCellular ? info.fetchWithCellularData : true) &&
          (await hasInternetConnection());
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

        this.#data.hasInternet = hasInternet;
        this._emitEvent(event, this.hasInternet);
      },
      REPLACERS.isNative ? 8000 : 5000,
    );

    this.#listeners[event] = () => {
      clearIntervalPolyfill(hasInternetId);
    };
  };

  private _initStatePhone = () => {
    if (!REPLACERS.isNative) return;

    const event = EventsDeviceInfo.statePhoneChange;
    if (this.#listeners[event]) return;

    const statePhoneListener = DeviceEventEmitter.addListener(
      "onUpdateSuspendResume",
      (data: typeDataReceivedState) => {
        if (data.state === this.statePhone) return;

        this.#data.statePhone = data.state || "resumed";
        this._emitEvent(event, this.statePhone);
      },
    );
    this.#listeners[event] = () => statePhoneListener.remove();
  };

  private _initQueryAppState = () => {
    if (!REPLACERS.isNative) return;

    const event = EventsDeviceInfo.queryAppState;
    if (this.#listeners[event]) return;

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

    const event = EventsDeviceInfo.notificationAction;
    if (this.#listeners[event]) return;

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

              const { notificationsManager } = await import("@utils");
              await notificationsManager.waitUntilLoaded();

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

              const { notificationsManager } = await import("@utils");
              await notificationsManager.waitUntilLoaded();

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

    this.#listeners[event] = () => subscription.remove();
  };

  private _initVerifyLocation = async () => {
    const event = EventsDeviceInfo.verifyLocation;
    if (this.#listeners[event]) return;

    const { notificationsManager } = await import("@utils");
    await notificationsManager.waitUntilLoaded();
    const notification =
      notificationsManager.getNotification("locationEnabled");
    if (!notification.enabled) return;

    const id = setIntervalPolyfill(verifyLocation, 15000);
    this.#listeners[event] = () => clearIntervalPolyfill(id);
  };

  private _initBatteryAlerts = async () => {
    const event = EventsDeviceInfo.batteryAlerts;
    if (this.#listeners[event]) return;

    const reasonNotification: ReasonNotification = event;
    const { notificationsManager } = await import("@utils");
    await notificationsManager.waitUntilLoaded();

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

    const event = EventsDeviceInfo.screenChange;
    if (this.#listeners[event]) return;

    let prevScreen: ScreensAvailable = "Home";

    const remover = navigationRef.current?.addListener("state", () => {
      const route = navigationRef.current?.getCurrentRoute();
      const screen = route?.name || "Home";
      if (screen === prevScreen) return;

      this._emitEvent(event, prevScreen, screen);
      prevScreen = screen;
    });
    this.#listeners[event] = () => remover?.();
  };

  private _initNetworkTypeChange = async () => {
    const event = EventsDeviceInfo.networkTypeChange;
    if (this.#listeners[event]) return;

    const subscription = NetInfo.addEventListener((state) => {
      if (this.#data.networkInfo.type === state.type) return;

      this.#data.networkInfo = {
        ...this.#data.networkInfo,
        type: state.type,
        isCellular: state.type === NetInfo.NetInfoStateType.cellular,
      };

      this._emitEvent(event, state.type);
    });

    this.#listeners[event] = () => subscription();
  };

  private _initNetworkSettings = async () => {
    const [data] = await Promise.all([
      NetInfo.fetch(),
      storageManagement.waitUntilLoaded(),
    ]);

    let info = storageManagement.get("NETWORK_SETTINGS");
    if (!info) {
      info = {
        fetchWithCellularData: REPLACERS.isWeb,
      };
      storageManagement.save("NETWORK_SETTINGS", info);
    }

    this.#data.networkInfo = {
      ...info,
      type: data.type,
      isCellular: data.type === NetInfo.NetInfoStateType.cellular,
    };
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
        this._initNetworkSettings(),
        this._initNetworkTypeChange(),
      ]);

      this.#initialized = true;
      this.#initPromise = null;
    };

    this.#initPromise = init();

    return this.#initPromise;
  };

  public waitUntilLoaded = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;
    return this._init();
  };

  public initListener = (event: EventsDeviceInfo) => {
    const l: Record<EventsDeviceInfo, () => Promise<void> | void> = {
      [EventsDeviceInfo.screenChange]: this._initScreenChange,
      [EventsDeviceInfo.batteryAlerts]: this._initBatteryAlerts,
      [EventsDeviceInfo.queryAppState]: this._initQueryAppState,
      [EventsDeviceInfo.appStateChange]: this._initAppState,
      [EventsDeviceInfo.verifyLocation]: this._initVerifyLocation,
      [EventsDeviceInfo.statePhoneChange]: this._initStatePhone,
      [EventsDeviceInfo.hasInternetChange]: this._initHasInternet,
      [EventsDeviceInfo.networkTypeChange]: this._initNetworkTypeChange,
      [EventsDeviceInfo.notificationAction]: this._initNotificationEvents,

      [EventsDeviceInfo.isBackgroundChange]: () => {},
    };

    const initFunction = l[event];
    if (initFunction) return initFunction();
  };

  public removeListener = (event: EventsDeviceInfo) => {
    if (!this.#listeners[event]) return;

    switch (event) {
      case EventsDeviceInfo.screenChange:
      case EventsDeviceInfo.batteryAlerts:
      case EventsDeviceInfo.queryAppState:
      case EventsDeviceInfo.appStateChange:
      case EventsDeviceInfo.verifyLocation:
      case EventsDeviceInfo.statePhoneChange:
      case EventsDeviceInfo.hasInternetChange:
      case EventsDeviceInfo.networkTypeChange:
      case EventsDeviceInfo.notificationAction:
        return this.#listeners[event]();
      default:
        break;
    }
  };

  constructor() {
    this._init();
  }
}

export const deviceInfo = new DeviceInfo();
