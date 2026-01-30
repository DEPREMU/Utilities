import { setTimeoutPolyfill } from "../functions";
import { PlatformData } from "./platform";
import * as ExpoFileSystem from "expo-file-system";

export const DATA_PLATFORM: PlatformData = {
  version: "",
  hasBattery: true,
  isElectron: false,
};

export const deleteDirectoryPickerFolder = () => {
  setTimeoutPolyfill(() => {
    try {
      new ExpoFileSystem.Directory(
        ExpoFileSystem.Paths.cache,
        "DirectoryPicker",
      ).delete();
    } catch {
      // Ignore errors
    }
  }, 1000);
};

export const deleteDirectoryImageManipulatorFolder = () => {
  setTimeoutPolyfill(() => {
    try {
      new ExpoFileSystem.Directory(
        ExpoFileSystem.Paths.cache,
        "ImageManipulator",
      ).delete();
    } catch {
      // Ignore errors
    }
  }, 1000);
};

import PDF from "react-native-pdf";
export { PDF };
