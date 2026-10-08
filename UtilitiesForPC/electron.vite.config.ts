import fs from "fs";
import path from "path";
import type { Plugin } from "vite";
import { defineConfig } from "electron-vite";
import { getAllPathsSync } from "../common/serverOrElectron/fs";

const { utilitiesForPC, app, common, types } = getAllPathsSync();

const packageJsonPath = path.resolve(utilitiesForPC, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
  version: string;
};

const appConfigPath = path.resolve(app, "app.config.ts");

let webVersion = "";
if (process.env.WEB_VERSION) {
  webVersion = process.env.WEB_VERSION;
} else if (fs.existsSync(appConfigPath)) {
  const appConfigContent = fs.readFileSync(appConfigPath, "utf-8");
  const match = appConfigContent.match(/version\s*=\s*["']([^"']+)["']/);
  if (!match?.[1])
    throw new Error("App version cannot be empty!" + appConfigPath);

  webVersion = match[1];
}

const electronVersion = process.env.ELECTRON_VERSION || packageJson.version;
const isWindows =
  process.env.BUILD_IS_WINDOWS !== undefined
    ? process.env.BUILD_IS_WINDOWS === "true"
    : process.platform === "win32";

const BUILD_PROFILE =
  process.env.BUILD_PROFILE ||
  (!process.env.NODE_ENV || process.env.NODE_ENV === "production"
    ? "production"
    : "development");
const isProduction = BUILD_PROFILE === "production";
const apiUrl = process.env.API_URL || "https://utilities.depremu.com/api";

/**
 * Creates the replacer plugin for compile-time token and constant replacement.
 * @param isPreload Whether the target pipeline is the preload script.
 * @returns A Vite Plugin implementing compile-time code transformations.
 */
const createReplacersPlugin = (isPreload = false): Plugin => {
  return {
    name: `utilities-replacers-${isPreload ? "preload" : "main"}`,
    transform(code: string, id: string): { code: string; map: null } | null {
      if (!id.match(/\.(ts|js|cjs|mjs)$/)) return null;

      let transformed = code;

      transformed = transformed.replace(
        /[a-zA-Z_]+\.getValue\([\n\s]*"isWindows"[\n\s]*\)/g,
        JSON.stringify(isWindows),
      );

      transformed = transformed.replace(
        /process\.env\.API_URL/g,
        JSON.stringify(apiUrl),
      );

      transformed = transformed.replace(
        /process\.env\.BUILD_PROFILE/g,
        JSON.stringify(BUILD_PROFILE),
      );

      transformed = transformed.replace(
        /{{ELECTRON_VERSION}}/g,
        electronVersion,
      );

      transformed = transformed.replace(/{{WEB_VERSION}}/g, webVersion);

      transformed = transformed.replace(
        /REPLACERS\.isDev/g,
        String(!isProduction),
      );
      transformed = transformed.replace(
        /REPLACERS\.isProduction/g,
        String(isProduction),
      );
      transformed = transformed.replace(/REPLACERS\.isWeb/g, "false");
      transformed = transformed.replace(
        /REPLACERS\.isWindows/g,
        String(isWindows),
      );
      transformed = transformed.replace(
        /REPLACERS\.isLinux/g,
        String(!isWindows),
      );
      transformed = transformed.replace(/REPLACERS\.isNative/g, "false");
      transformed = transformed.replace(/REPLACERS\.isPreview/g, "false");
      transformed = transformed.replace(
        /REPLACERS\.typeBuild/g,
        JSON.stringify("normal"),
      );

      if (isProduction) {
        transformed = transformed.replace(
          /REPLACERS\.Logger/g,
          "(() => ({ log: () => {}, warn: () => {}, error: () => {} }))",
        );
        if (isPreload) {
          transformed = transformed.replace(/sendLog\(/g, "(() => {})(");
        }
      }

      return { code: transformed, map: null };
    },
  };
};

/**
 * Dynamically discovers all Piscina worker scripts in the common directory.
 * @returns Map of rollup entry point names to source file paths.
 */
const discoverPiscinaWorkers = (): Record<string, string> => {
  const piscinaDir = path.resolve(common, "serverOrElectron/piscina");
  const workers: Record<string, string> = {};

  if (!fs.existsSync(piscinaDir)) return workers;

  const files = fs.readdirSync(piscinaDir);
  for (const file of files) {
    if (file.endsWith(".worker.ts")) {
      const entryName = `piscina/${file.replace(/\.ts$/, "")}`;
      workers[entryName] = path.join(piscinaDir, file);
    }
  }

  return workers;
};

const externalElectron = [
  "pino",
  "sharp",
  "pdfkit",
  "piscina",
  "node-7z",
  "7zip-bin",
  "electron",
  "unzipper",
  "bonjour-service",
  "electron-edge-js",
];

export default defineConfig({
  main: {
    plugins: [createReplacersPlugin(false)],
    resolve: {
      alias: {
        "@": path.resolve(utilitiesForPC, "src/main"),
        "@utils": path.resolve(utilitiesForPC, "src/main/utils"),
        "@types": path.resolve(utilitiesForPC, "../types/index.d.ts"),
        "@common": path.resolve(common, "serverOrElectron/index.ts"),
        "@commonSrc": common,
        "@REPLACERS": path.resolve(common, "both/REPLACERS/REPLACERS.ts"),
      },
    },
    build: {
      outDir: path.resolve(utilitiesForPC, "out/main"),
      emptyOutDir: true,
      minify: isProduction,
      rollupOptions: {
        external: externalElectron,
        input: {
          index: path.resolve(utilitiesForPC, "src/main/index.ts"),
          ...discoverPiscinaWorkers(),
        },
        output: {
          format: "es",
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  },
  preload: {
    plugins: [createReplacersPlugin(true)],
    resolve: {
      alias: {
        "@": path.resolve(utilitiesForPC, "src/preload"),
        "@types": path.resolve(types, "index.d.ts"),
        "@common": path.resolve(common, "both/index.ts"),
        "@REPLACERS": path.resolve(
          common,
          "both/REPLACERS/REPLACERS.frontend.ts",
        ),
      },
    },
    build: {
      outDir: path.resolve(utilitiesForPC, "out/preload"),
      emptyOutDir: true,
      minify: isProduction,
      rollupOptions: {
        external: externalElectron,
        input: {
          preload: path.resolve(utilitiesForPC, "src/preload/index.ts"),
        },
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
          chunkFileNames: "chunks/[name]-[hash].cjs",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  },
});
