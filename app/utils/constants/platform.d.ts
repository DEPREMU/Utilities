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
