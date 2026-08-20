/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { Chalk } from "chalk";
const chalk = new Chalk({ level: 1 });

const withGoogleServices = (config) => {
  if (process.env.EAS_BUILD !== "1") return config;
  if (process.env.PLATFORM !== "android") return config;

  console.log(chalk.blue("Plugin handleCreateFiles.js is being executed..."));

  const projectRoot = config._internal?.projectRoot || process.cwd();
  const files = fs.readdirSync(projectRoot, { recursive: true });

  if (files.some((f) => f.endsWith("app/google-services.json"))) return config;
  else
    throw new Error(
      chalk.red(
        `google-services.json not found, make sure the file is in the app directory ${
          projectRoot?.endsWith("app")
            ? path.join(projectRoot, "google-services.json")
            : path.join(projectRoot, "app", "google-services.json")
        }`,
      ),
    );
};

export default withGoogleServices;
