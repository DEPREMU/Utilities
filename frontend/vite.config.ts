import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import type { ConfigFunction } from "@babel/core";
import type { Paths, REPLACERS_TYPE } from "@types";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";

const config = (): ReturnType<ConfigFunction> => {
  const TYPE_BUILD = process.env.TYPE_BUILD;
  const BUILD_PROFILE = process.env?.BUILD_PROFILE;

  if (!BUILD_PROFILE)
    throw new Error("BUILD_PROFILE environment variable is not set");
  if (!TYPE_BUILD || !["clipboard", "test", "normal"].includes(TYPE_BUILD))
    throw new Error("TYPE_BUILD environment variable is not set");

  const replacers: Record<Exclude<Paths<REPLACERS_TYPE>, "Logger">, string> = {
    isDev: `${BUILD_PROFILE === "development"}`,
    isWeb: "true",
    isLinux: "false",
    isNative: "false",
    isWindows: "false",
    typeBuild: JSON.stringify(TYPE_BUILD),
    isPreview: `${BUILD_PROFILE === "preview"}`,
    isProduction: `${BUILD_PROFILE === "production"}`,
    "Logger.log": BUILD_PROFILE === "production" ? "(()=>{})" : "",
    "Logger.warn": BUILD_PROFILE === "production" ? "(()=>{})" : "",
    "Logger.error": BUILD_PROFILE === "production" ? "(()=>{})" : "",
  };

  const REPLACERS: Record<string, string> = Object.fromEntries(
    Object.entries(replacers)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [`REPLACERS.${key}`, value]),
  );

  const finalReplacers = {
    ...REPLACERS,
    "process.env.TYPE_BUILD": JSON.stringify(TYPE_BUILD),
    "process.env.BUILD_PROFILE": JSON.stringify(BUILD_PROFILE),
  };

  return {
    plugins: [
      [
        "module-resolver",
        {
          extensions: [".ts", ".tsx", ".json"],
          alias: {
            "@": "./src",
            "@types": "../types/index.d.ts",
            "@utils": "./src/utils/index.ts",
            "@common": "../common/both/index.ts",
            "@commonSrc": "../common",
            "@REPLACERS": "../common/both/REPLACERS/REPLACERS.frontend.ts",
          },
        },
      ],
      [
        "babel-plugin-transform-replace-expressions",
        {
          replace: finalReplacers,
          allowConflictingReplacements: true,
        },
      ],
      "babel-plugin-minify-constant-folding",
      "babel-plugin-transform-remove-undefined",
      "babel-plugin-minify-guarded-expressions",
      "babel-plugin-minify-dead-code-elimination",
      "@babel/plugin-transform-export-namespace-from",
    ],
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()], ...config() })],
});
