import { checkBattery } from "./checkBattery";
import { ExpectedNativeWebData } from "@types";

class NativeData {
  private data: ExpectedNativeWebData;

  constructor(data: ExpectedNativeWebData) {
    this.data = data;
  }

  public getValue = <T extends keyof ExpectedNativeWebData>(
    key: T
  ): ExpectedNativeWebData[T] => {
    return this.data?.[key];
  };
}
const nativeData = new NativeData({
  hasBattery: checkBattery(),
});

export * from "./checkBattery";

export default nativeData;
