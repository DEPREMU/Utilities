import windowModule from "../modules/WindowModule";
import { PlatformData } from "./platform";

const DATA_PLATFORM: PlatformData = {
  isElectron: false,
  hasBattery: false,
  version: "",
};

windowModule.isElectronBuild().then((result) => {
  DATA_PLATFORM.isElectron = result;
});
windowModule.getNativeData("hasBattery").then((result) => {
  if (result === "unknown") return;

  DATA_PLATFORM.hasBattery = result as boolean;
});
windowModule.getNativeData("version").then((result) => {
  DATA_PLATFORM.version = result as string;
});

export { DATA_PLATFORM };
