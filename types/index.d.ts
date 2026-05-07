export * from "./API";
export * from "./env";
export * from "./screens";
export * from "./zustand";
export * from "./typesVault";
export * from "./typesNotes";
export * from "./database/index";
export * from "./typesStorage";
export * from "./typesWebSocket";
export * from "./typesTaskRegistry";
export * from "./typesTranslations";
export * from "./typesNotifications";
export * from "./typesNativeModules";
export * from "./typesUtilitiesForPC";

export type REPLACERS_TYPE =
  | "isDev"
  | "isWeb"
  | "isNative"
  | "isPreview"
  | "isProduction";

export type Colors =
  | "info"
  | "text"
  | "error"
  | "accent"
  | "border"
  | "shadow"
  | "primary"
  | "success"
  | "warning"
  | "overlay"
  | "secondary"
  | "background";

export type Function<Args extends unknown[] = unknown[], Return = void> = (
  ...args: Args
) => Return;
