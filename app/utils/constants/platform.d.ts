import type PDF from "react-native-pdf";

export type PlatformData = {
  version: string;
  isElectron: boolean;
  hasBattery: boolean;
};

export declare const DATA_PLATFORM: PlatformData;

/**
 * @platform `native`
 */
export type DeleteDirectoryPickerFolder = () => void;

export declare const deleteDirectoryPickerFolder: DeleteDirectoryPickerFolder;

/**
 * @platform `native`
 */
export type DeleteDirectoryImageManipulatorFolder = () => void;

export declare const deleteDirectoryImageManipulatorFolder: DeleteDirectoryImageManipulatorFolder;

export declare const PDF: typeof PDF;
