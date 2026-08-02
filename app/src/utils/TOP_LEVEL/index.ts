import { REPLACERS } from "@common";

export * from "./config";
//! export * from "./debug" it is imported by config if !isProduction
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (REPLACERS.isDev) void require("./dev");
//! export * from "./global.native" it is imported by config if isNative
export * from "./variables";
