import type PDF from "react-native-pdf";
import type * as RNFS from "@dr.pogodin/react-native-fs";
import type PDFDocType from "pdf-lib";

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

export type GetRandomUUID = () => string;

export declare const getRandomUUID: GetRandomUUID;

export declare const PDFDoc: typeof PDFDocType;

export declare const RNFSModule: typeof RNFS;
