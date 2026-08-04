process.env.IS_SERVER = "true";

import {
  options,
  external,
  REPLACERS_PLUGIN,
} from "@commonSrc/serverOrElectron/build";
import fs from "fs";
import path from "path";
import { pluginReplace } from "@espcom/esbuild-plugin-replace";
import { getAllPathsSync } from "@commonSrc/serverOrElectron/fs";
import { build, type Plugin } from "esbuild";

const { server: SERVER_PATH, common: COMMON_PATH } = getAllPathsSync();

const plugins: Plugin[] = [
  {
    name: "platform",
    setup: (build) => {
      build.onResolve({ filter: /.\/REPLACERS$/ }, () => ({
        path: path.join(COMMON_PATH, "both/REPLACERS/REPLACERS.server.ts"),
      }));
    },
  },
  pluginReplace([...REPLACERS_PLUGIN]),
];

build({
  ...options,
  plugins,
  external,

  outfile: path.join(SERVER_PATH, "build", "index.cjs"),
  entryPoints: [path.join(SERVER_PATH, "index.ts")],
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Build failed:", err);
  process.exit(1);
});

const piscinaWorkerPath = path.join(COMMON_PATH, "serverOrElectron", "piscina");

fs.readdir(piscinaWorkerPath, async (err, files) => {
  if (err) throw new Error(`Error reading workers directory: ${err.message}`);

  await Promise.all(
    files.map((file) => {
      if (!file.endsWith("worker.ts")) return;

      return build({
        ...options,
        plugins,
        external,

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
