import * as RNFS from "@dr.pogodin/react-native-fs";
import * as PDFLib from "pdf-lib";
import { randomUUID } from "react-native-quick-crypto";
import { PlatformData } from "./platform";
import * as ExpoFileSystem from "expo-file-system";

export const DATA_PLATFORM: PlatformData = {
  version: "",
  hasBattery: true,
  isElectron: false,
};

export const deleteDirectoryPickerFolder = () => {
  import("../functions").then(({ setTimeoutPolyfill }) => {
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
  });
};

export const deleteDirectoryImageManipulatorFolder = () => {
  import("../functions").then(({ setTimeoutPolyfill }) => {
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
  });
};

import PDF from "react-native-pdf";
export { PDF };

export const getRandomUUID = () => randomUUID();

export const PDFDoc = PDFLib;

export const RNFSModule = RNFS;
