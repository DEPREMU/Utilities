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
import * as NetInfo from "@react-native-community/netinfo";
import { REPLACERS } from "../TOP_LEVEL";
import * as Location from "expo-location";
import { navigation } from "./navigation";
import { DATA_PLATFORM } from "../cross";
import * as DeviceInfoRN from "react-native-device-info";
import { storageManagement } from "./storage";
import { ExpectedSecureStorageTypes, ServiceClass } from "@common";
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

type Function<T extends unknown[] = unknown[]> = (...args: T) => void;

type ListenersDeviceInfo = {
  [EventsDeviceInfo.screenChange]: Function<
    [prevScreen: ScreensAvailable, newScreen: ScreensAvailable]
  >;
  [EventsDeviceInfo.queryAppState]: Function;
  [EventsDeviceInfo.batteryAlerts]: Function;
  [EventsDeviceInfo.verifyLocation]: Function;
  [EventsDeviceInfo.appStateChange]: Function<[newState: AppStateStatus]>;
  [EventsDeviceInfo.statePhoneChange]: Function<
    [newState: typeDataReceivedState["state"]]
  >;
  [EventsDeviceInfo.hasInternetChange]: Function<[newState: boolean]>;
  [EventsDeviceInfo.isBackgroundChange]: Function<[newState: boolean]>;
  [EventsDeviceInfo.notificationAction]: Function<[action: EventNativeModule]>;
  [EventsDeviceInfo.networkTypeChange]: Function<
    [type: NetInfo.NetInfoStateType]
  >;
};

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

class DeviceInfo extends ServiceClass<ListenersDeviceInfo> {
  override destroy() {
    super.destroy();
  }

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

  private _initAppState = () => {
    const event = EventsDeviceInfo.appStateChange;
    if (this.#listeners[event]) return;

    const appStateListener = AppState.addEventListener(
      "change",
      (nextState) => {
        const newIsBackground = nextState !== "active";

        if (this.isBackground === newIsBackground) return;

        this.#data.isBackground = newIsBackground;
        this.emit(EventsDeviceInfo.isBackgroundChange, this.isBackground);
      },
    );
    this.#listeners[event] = () => appStateListener.remove();
  };

  private _initHasInternet = async () => {
    const event = EventsDeviceInfo.hasInternetChange;
    if (this.#listeners[event]) return;
    const reason: ReasonNotification = "noInternetConnection";

    const { notificationsManager, hasInternetConnection } =
      await import("@utils");

    await notificationsManager.waitUntilInitialized();
    const notification = notificationsManager.getNotification(reason);
    if (!notification.enabled) return;

    const hasInternetId = setIntervalPolyfill(
      async () => {
        const prev = this.hasInternet;
        const info = this.fetchNetworkInfo;

        const current =
          (!info.isCellular || info.fetchWithCellularData) &&
          (await hasInternetConnection());
        if (prev === current) return;

        if (REPLACERS.isNative)
          NotificationModule.cancelPreviousReasonNotification(reason);

        if (prev && !current) {
          notificationsManager.sendNotification({
            type: "warning",
            title: tTyped("common.NoInternetConnection"),
            message: tTyped("common.PleaseCheckInternetConnection"),
            channelId: reason,
            reasonNotification: reason,
            overrideNotification: false,
          });
        } else {
          notificationsManager.sendNotification({
            type: "info",
            title: tTyped("InternetConnectionRestored"),
            message: tTyped("YouAreBackOnline"),
            channelId: reason,
            reasonNotification: reason,
            overrideNotification: false,
          });
        }

        this.#data.hasInternet = current;
        this.emit(event, this.hasInternet);
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
        this.emit(event, this.statePhone);
      },
    );
    this.#listeners[event] = () => statePhoneListener.remove();
  };

  private _initQueryAppState = () => {
    if (!REPLACERS.isNative) return;

    const event = EventsDeviceInfo.queryAppState;
    if (this.#listeners[event]) return;

    BackgroundModule.setReactAlive(true);
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
            navigation.replace("Settings");
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
                  updateAvailable: 15,
                  allNotifications: 60,
                  noInternetConnection: 15,
                  recorderNotification: 30,
                  loggedInStatusChannel: 15,
                };

                return (defaultTimes[reason] || 60) * 60 * 1000;
              };

              if (event.reasonNotification === "streamers") break;

              const { notificationsManager } = await import("@utils");
              await notificationsManager.waitUntilInitialized();

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
              await notificationsManager.waitUntilInitialized();

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
    await notificationsManager.waitUntilInitialized();
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
    await notificationsManager.waitUntilInitialized();

    await notificationsManager.waitUntilInitialized();
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
    await storageManagement.waitUntilInitialized();
    if (!storageManagement.hasUI) return;

    const event = EventsDeviceInfo.screenChange;
    if (this.#listeners[event]) return;

    let prevScreen: ScreensAvailable = "Home";

    const remover = navigation.ref.current?.addListener("state", () => {
      const route = navigation.ref.current?.getCurrentRoute();
      const screen = route?.name || "Home";
      if (screen === prevScreen) return;

      this.emit(event, prevScreen, screen);
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

      this.emit(event, state.type);
    });

    this.#listeners[event] = () => subscription();
  };

  private _initNetworkSettings = async () => {
    const [data] = await Promise.all([
      NetInfo.fetch(),
      storageManagement.waitUntilInitialized(),
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

  override async _init(): Promise<void> {
    try {
      this._initAppState();

      const promises: Promise<void>[] = [];

      if (REPLACERS.isNative) {
        this._initStatePhone();
        this._initQueryAppState();
        this._initNotificationEvents();
      }

      promises.push(
        this._initHasInternet(),
        this._initScreenChange(),
        this._initBatteryAlerts(),
        this._initVerifyLocation(),
        this._initNetworkSettings(),
        this._initNetworkTypeChange(),
      );

      await Promise.all(promises);
    } catch (error) {
      logger.error(
        "Error initializing DeviceInfo service",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

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
    super();
    this._reInit();
  }
}

export const deviceInfo = new DeviceInfo();
