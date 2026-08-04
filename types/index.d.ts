export * from "./API";
export * from "./env";
export * from "./global";
export * from "./piscina";
export * from "./screens";
export * from "./zustand";
export * from "./database";
export * from "./typesVault";
export * from "./typesNotes";
export * from "./typesStorage";
export * from "./typesWebSocket";
export * from "./typesTaskRegistry";
export * from "./typesTranslations";
export * from "./typesNotifications";
export * from "./typesNativeModules";
export * from "./typesUtilitiesForPC";

export type Logger = {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type REPLACERS_TYPE = {
  //? App
  isWeb: boolean;
  isNative: boolean;

  //? ServerOrElectron
  isLinux: boolean;
  isWindows: boolean;

  //? Common
  Logger: Logger;

  //? Env
  isDev: boolean;
  isPreview: boolean;
  isProduction: boolean;
};

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

export type Slice<
  T extends unknown[],
  N extends number,
  Acc extends unknown[] = [],
> = Acc["length"] extends N
  ? T
  : T extends [unknown, ...infer Rest]
    ? Slice<Rest, N, [...Acc, unknown]>
    : [];

export type TypeOfJS = {
  string: string;
  number: number;
  bigint: bigint;
  symbol: symbol;
  object: object;
  boolean: boolean;
  function: () => unknown;
  undefined: undefined;
};
