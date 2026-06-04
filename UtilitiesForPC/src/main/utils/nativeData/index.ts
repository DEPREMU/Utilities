import { ServiceClass } from "@common";
import { checkBattery } from "./checkBattery";
import { ExpectedNativeWebData } from "@types";

class NativeData extends ServiceClass<Record<string, () => void>> {
  static instance: NativeData;

  version: ExpectedNativeWebData["version"] = "{{ELECTRON_VERSION}}";
  hasBattery: boolean = false;

  override async _init(): Promise<void> {
    const batteryStatus = await checkBattery();
    this.hasBattery = typeof batteryStatus === "boolean" && batteryStatus;
  }

  getValue<K extends keyof ExpectedNativeWebData>(
    key: K,
  ): ExpectedNativeWebData[K] {
    switch (key) {
      case "version":
        return this.version as ExpectedNativeWebData[K];
      case "hasBattery":
        return this.hasBattery as ExpectedNativeWebData[K];
      default:
        return null as unknown as ExpectedNativeWebData[K];
    }
  }

  constructor() {
    super();

    if (NativeData.instance) {
      return NativeData.instance;
    } else {
      NativeData.instance = this;
    }

    this._reInit();
  }
}

export const nativeData = new NativeData();

export * from "./checkBattery";
