import {
  Timers,
  Network,
  REPLACERS,
  ServiceClass,
  ExpectedSecureStorageTypes,
} from "@common";
import { Logger } from "../TOP_LEVEL";
import { tTyped } from "../translates";
import { Actions } from "./notifications/actions";
import * as NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import { navigation } from "./navigation";
import { DATA_PLATFORM } from "../cross";
import * as DeviceInfoRN from "react-native-device-info";
import { BackgroundModule } from "@modules";
import { storageManagement } from "./storage";
import { isLocationEnabled } from "../functions";
import { ScreensAvailable, ReasonNotification } from "@types";
import { AppState, AppStateStatus, DeviceEventEmitter } from "react-native";

const enum DoubleCheckStatus {
  checked = 0,
  changed = 2,
  restarted = 1,
}

const logger = new Logger("ServicesDeviceInfo");

type typeDataReceivedState = { state: "suspended" | "resumed" };

type NetworkInfo = {
  type: NetInfo.NetInfoStateType;
  isCellular: boolean;
} & ExpectedSecureStorageTypes["NETWORK_SETTINGS"];

type typeDeviceInfo = {
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
  [EventsDeviceInfo.networkTypeChange]: Function<
    [type: NetInfo.NetInfoStateType]
  >;
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

  set #hasInternet(value: boolean) {
    if (this.#data.hasInternet === value) return;

    this.#data.hasInternet = value;
    this.emit(EventsDeviceInfo.hasInternetChange, value);
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
    this.#listeners[event] = appStateListener.remove;
  };

  #running = {
    hasInternet: false,
    batteryAlerts: false,
    verifyLocation: false,
  };
  #doubleCheck: DoubleCheckStatus = DoubleCheckStatus.checked;
  private _initHasInternet = async () => {
    const event = EventsDeviceInfo.hasInternetChange;
    if (this.#listeners[event]) return;
    const reason = "noInternetConnection" satisfies ReasonNotification;

    const hasInternetId = Timers.setInterval(
      async () => {
        if (this.#running.hasInternet) return;
        this.#running.hasInternet = true;

        try {
          const { notificationsManager } = await import("./notifications");
          await notificationsManager.waitUntilInitialized();

          const prev = this.hasInternet;
          const info = this.fetchNetworkInfo;

          const current =
            (!info.isCellular || info.fetchWithCellularData) &&
            (await Network.isOnline());
          this.#hasInternet = current;
          const notification = notificationsManager.getNotification(reason);

          if (!notification.enabled) return;

          const { aggressive, doubleCheck } = notification.behavior;

          if (
            prev === current &&
            !aggressive &&
            (!doubleCheck || this.#doubleCheck === DoubleCheckStatus.restarted)
          ) {
            if (!doubleCheck) this.#doubleCheck = DoubleCheckStatus.changed;
            return;
          }
          if (doubleCheck) {
            if (prev === current) {
              if (
                this.#doubleCheck === DoubleCheckStatus.changed ||
                this.#doubleCheck === DoubleCheckStatus.restarted
              ) {
                this.#doubleCheck = DoubleCheckStatus.checked;
                return;
              } else if (this.#doubleCheck === DoubleCheckStatus.checked) {
                this.#doubleCheck = DoubleCheckStatus.restarted;
              }
            } else {
              this.#doubleCheck = DoubleCheckStatus.changed;
              return;
            }
          }

          if (REPLACERS.isNative)
            await notificationsManager.removeNotification({ reason });

          if (!current) {
            await notificationsManager.sendNotification({
              type: "warning",
              title: tTyped("common.NoInternetConnection"),
              message: tTyped("common.PleaseCheckInternetConnection"),
              actions: Actions.getActions(["stop", "pause", "dismiss"]),
              channelId: reason,
              reasonNotification: reason,
            });
          } else {
            await notificationsManager.sendNotification({
              type: "info",
              title: tTyped("appInfo.InternetConnectionRestored"),
              message: tTyped("appInfo.YouAreBackOnline"),
              actions: Actions.getActions(["stop", "pause", "dismiss"]),
              channelId: reason,
              reasonNotification: reason,
            });
          }
        } finally {
          this.#running.hasInternet = false;
        }
      },
      REPLACERS.isNative ? 8000 : 5000,
    );

    this.#listeners[event] = () => {
      Timers.clearInterval(hasInternetId);
    };
  };

  private _initVerifyLocation = async () => {
    const event = EventsDeviceInfo.verifyLocation;
    if (this.#listeners[event]) return;
    const reason = "locationEnabled" satisfies ReasonNotification;

    const { notificationsManager } = await import("./notifications");
    await notificationsManager.waitUntilInitialized();

    const notification = notificationsManager.getNotification(reason);
    if (!notification.enabled) return;

    const id = Timers.setInterval(async () => {
      if (this.#running.verifyLocation) return;
      this.#running.verifyLocation = true;

      try {
        const [{ status }, { notificationsManager }] = await Promise.all([
          Location.getBackgroundPermissionsAsync(),
          import("./notifications"),
        ]);

        const hasPermission = status === "granted";
        if (!hasPermission) {
          await notificationsManager.toggleNotification("locationEnabled");
          return;
        }

        const locationEnabled = await isLocationEnabled();
        if (!locationEnabled) return;

        await notificationsManager.sendNotification({
          type: "info",
          title: tTyped("notifications.LocationServicesEnabled"),
          actions: Actions.getActions(["stop", "pause", "dismiss"]),
          message: tTyped("notifications.LocationServicesEnabledMessage"),
          channelId: reason,
          reasonNotification: reason,
        });
      } finally {
        this.#running.verifyLocation = false;
      }
    }, 15000);
    this.#listeners[event] = () => Timers.clearInterval(id);
  };

  private _initBatteryAlerts = async () => {
    const event = EventsDeviceInfo.batteryAlerts;
    if (this.#listeners[event]) return;

    const reason = "batteryAlerts" satisfies ReasonNotification;
    const { notificationsManager } = await import("./notifications");
    await notificationsManager.waitUntilInitialized();

    const notification = notificationsManager.getNotification(reason);
    if (!notification.enabled) return;

    const id = Timers.setInterval(async () => {
      if (this.#running.batteryAlerts) return;
      this.#running.batteryAlerts = true;

      try {
        const powerState = await DeviceInfoRN.getPowerState();
        const batteryLevel = powerState.batteryLevel;
        const batteryState = powerState.batteryState || "unknown";

        if (batteryLevel === undefined) return;

        const { min, max } =
          notificationsManager.getNotification(reason).behavior.batteryLevel;

        if (batteryState === "charging" || batteryState === "full") {
          if (batteryLevel <= max / 100) return;

          await notificationsManager.sendNotification({
            type: "info",
            title: tTyped("batteryState.BatteryFullyCharged"),
            message: tTyped("batteryState.YouCanUnplugYourDevice"),
            actions: Actions.getActions(["dismiss", "pause", "stop"]),
            channelId: "batteryAlerts",
            reasonNotification: reason,
          });
          return;
        }

        if (batteryLevel >= min / 100) return;

        await notificationsManager.sendNotification({
          type: "warning",
          title: tTyped("batteryState.BatteryLow"),
          message: tTyped("batteryState.YourBatteryIsLow"),
          actions: Actions.getActions(["dismiss", "pause", "stop"]),
          channelId: "batteryAlerts",
          reasonNotification: reason,
        });
      } finally {
        this.#running.batteryAlerts = false;
      }
    }, 10000);

    if (REPLACERS.isWeb && !DATA_PLATFORM.hasBattery) Timers.clearInterval(id);
    else {
      this.#listeners[event] = () => Timers.clearInterval(id);
    }
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
    this.#listeners[event] = statePhoneListener.remove;
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

    this.#listeners[event] = queryAppStateListener.remove;
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

    this.#listeners[event] = subscription;
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
      }

      promises.push(
        this._initHasInternet(),
        this._initScreenChange(),
        this._initBatteryAlerts(),
        this._initVerifyLocation(),
        this._initNetworkSettings(),
        this._initNetworkTypeChange(),
      );

      await Promise.allSettled(promises);
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
        {
          const cleaner = this.#listeners[event];
          cleaner();
          delete this.#listeners[event];
        }
        break;
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
