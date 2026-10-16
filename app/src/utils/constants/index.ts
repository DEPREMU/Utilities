import Constants from "expo-constants";

export * from "./assets";

export const APP_NAME = Constants.expoConfig?.name as string;
export const WA_LINK = Constants.expoConfig?.extra?.WPP_LINK as string;
