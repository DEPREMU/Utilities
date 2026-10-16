process.env.IS_SERVER = "true";

import {
  options,
  externalServer,
  externalWorkers,
} from "@commonSrc/serverOrElectron/build";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { exec } from "child_process";
import { REPLACERS } from "@commonSrc/both/REPLACERS";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import { REPLACERS_TYPE } from "@types";
import { getAllPathsSync } from "@commonSrc/serverOrElectron/fs";
import { build, type Plugin } from "esbuild";

const {
  root,
  server: SERVER_PATH,
  common: COMMON_PATH,
  frontend: FRONTEND_PATH,
} = getAllPathsSync();

const REPLACERS_REPLACED: Record<keyof REPLACERS_TYPE, string> = {
  isDev: `${REPLACERS.isDev}`,
  isWeb: `${REPLACERS.isWeb}`,
  isLinux: `${REPLACERS.isLinux}`,
  isServer: `${REPLACERS.isServer}`,
  isNative: `${REPLACERS.isNative}`,
  isWindows: `${REPLACERS.isWindows}`,
  isPreview: `${REPLACERS.isPreview}`,
  typeBuild: `"${REPLACERS.typeBuild}"`,
  isProduction: `${REPLACERS.isProduction}`,
};

export const REPLACERS_PLUGIN: Parameters<
  typeof import("@espcom/esbuild-plugin-replace").pluginReplace
>[0] = [
  ...Object.entries(REPLACERS_REPLACED).map(([key, value]) => {
    return {
      filter: /\.ts|\.js|\.cjs$/,
      replace: new RegExp(`REPLACERS.${key}`, "g"),
      replacer: () => value,
    };
  }),
  {
    filter: /\.ts|\.js|\.cjs$/,
    replace: /process\.env\.BUILD_PROFILE/g,
    replacer: () => JSON.stringify(process.env.BUILD_PROFILE || "production"),
  },
];

dotenv.config({ path: path.join(root, ".env") });

const plugins: Plugin[] = [pluginReplace([...REPLACERS_PLUGIN])];

await build({
  ...options,
  plugins,
  external: externalServer,

  outfile: path.join(SERVER_PATH, "build", "index.cjs"),
  entryPoints: [path.join(SERVER_PATH, "index.ts")],
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Build failed:", err);
  process.exit(1);
});

const {
  API_URL,
  TYPE_BUILD = "normal",
  BUILD_PROFILE = "production",
} = process.env;

if (!API_URL) throw new Error("API_URL environment variable is not set");

exec(
  "yarn run build",
  {
    cwd: FRONTEND_PATH,
    env: {
      ...process.env,
      API_URL,
      TYPE_BUILD,
      BUILD_PROFILE,
    },
  },
  (error, stdout) => {
    if (error) throw new Error(`Error building frontend: ${error.message}`);

    if (stdout.includes("built in")) {
      // eslint-disable-next-line no-console
      console.log(`Frontend built successfully: ${stdout}`);

      const distPath = path.join(FRONTEND_PATH, "dist");
      const webPagePath = path.join(SERVER_PATH, "build", "web-page");

      fs.rm(webPagePath, { recursive: true, force: true }, () => {
        fs.rename(distPath, webPagePath, () => {});
      });
    }
  },
);

const piscinaWorkerPath = path.join(COMMON_PATH, "serverOrElectron", "piscina");

fs.readdir(piscinaWorkerPath, async (err, files) => {
  if (err) throw new Error(`Error reading workers directory: ${err.message}`);

  await Promise.all(
    files.map((file) => {
      if (!file.endsWith("worker.ts")) return;

      return build({
        ...options,
        plugins,
        external: externalWorkers,

        outfile: path.join(
          SERVER_PATH,
          "build",
          "piscina",
          file.replace(".ts", ".cjs"),
        ),
        entryPoints: [path.join(piscinaWorkerPath, file)],
      });
    }),
  );
});
