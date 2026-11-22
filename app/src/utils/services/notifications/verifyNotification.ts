import { AppState } from "react-native";
import * as DeviceInfo from "react-native-device-info";
import { Notifications, ReasonNotification } from "@types";

type typeDeviceInfo = typeof import("../deviceInfo").deviceInfo;

export class VerifyNotification<T extends Notifications[ReasonNotification]> {
  #notification = {} as T;
  #deviceInfo = null as unknown as typeDeviceInfo;

  specificHours(): boolean {
    if (!this.#notification.behavior.onlyWhen.specificHours.enabled)
      return false;

    const currentHour = new Date().getHours();
    const { startHour, endHour } =
      this.#notification.behavior.onlyWhen.specificHours;

    const shouldReturn = currentHour < startHour || currentHour >= endHour;

    return shouldReturn;
  }

  screenOff(): boolean {
    return (
      this.#notification.behavior.onlyWhen.screenOff &&
      this.#deviceInfo.statePhone === "resumed"
    );
  }

  async connectedToPower(): Promise<boolean> {
    return (
      this.#notification.behavior.onlyWhen.connectedToPower &&
      !(await DeviceInfo.isBatteryCharging())
    );
  }

  notInDND(isDND: boolean): boolean {
    return this.#notification.behavior.onlyWhen.notInDoNotDisturb && isDND;
  }

  bypassDND(isDND: boolean): boolean {
    return this.#notification.behavior.bypassDoNotDisturb && isDND;
  }

  appInBackground(): boolean {
    return (
      this.#notification.behavior.onlyWhen.appInBackground &&
      AppState.currentState === "active"
    );
  }

  aggressive(hasId: boolean): boolean {
    return !this.#notification.behavior.aggressive && hasId;
  }

  static async create<T extends Notifications[ReasonNotification]>(
    notification: T,
  ): Promise<VerifyNotification<T>> {
    const deviceInfo = (await import("../deviceInfo")).deviceInfo;

    const instance = new VerifyNotification(
      notification,
      await deviceInfo.waitUntilInitialized(),
    );

    return instance;
  }

  constructor(notification: T, deviceInfo: typeDeviceInfo) {
    this.#deviceInfo = deviceInfo;
    this.#notification = notification;
  }
}
