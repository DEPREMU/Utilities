/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { Chalk } = require("chalk");
const chalk = new Chalk({ level: 1 });

const withGoogleServices = (config) => {
  console.log(chalk.blue("Plugin handleCreateFiles.js is being executed..."));

  if (
    process.env.EAS_BUILD === "true" &&
    process.env.GOOGLE_SERVICES_JSON &&
    !process.env.GOOGLE_SERVICES_JSON.startsWith("$")
  ) {
    try {
      console.log(
        chalk.blue(
          "Creating google-services.json from environment variable...",
        ),
      );

      const projectRoot = config._internal?.projectRoot || process.cwd();
      const googleServicesPath = path.join(
        projectRoot,
        "android",
        "app",
        "google-services.json",
      );
      if (fs.existsSync(googleServicesPath)) {
        console.log(
          chalk.yellow("google-services.json already exists at:"),
          googleServicesPath,
        );
        return config;
      }

      const googleServicesContent = Buffer.from(
        process.env.GOOGLE_SERVICES_JSON,
        "base64",
      ).toString("utf8");

      const parsed = JSON.parse(googleServicesContent);
      console.log(
        chalk.blue("Valid JSON with project_id:"),
        parsed.project_info?.project_id,
      );

      fs.writeFileSync(googleServicesPath, googleServicesContent);
      console.log(
        chalk.green("google-services.json created successfully in:"),
        googleServicesPath,
      );

      if (!fs.existsSync(googleServicesPath))
        throw new Error("File was not created successfully");

      console.log(chalk.green("File verified to exist"));
      const stats = fs.statSync(googleServicesPath);
      (console.log("File size:"), stats.size, "bytes");
    } catch (error) {
      console.error(chalk.red("Error creating google-services.json:"), error);
      throw error;
    }
  } else if (process.env.EAS_BUILD === "true") {
    console.error(
      chalk.red(
        "GOOGLE_SERVICES_JSON environment variable not found in EAS Build",
      ),
    );
    console.error(
      chalk.yellow("Available env vars:"),
      Object.keys(process.env).join("\n"),
    );
    throw new Error(
      chalk.red(
        "GOOGLE_SERVICES_JSON environment variable is required for EAS builds",
      ),
    );
  }

  console.log(chalk.green("Plugin handleCreateFiles.js finished."));
  return config;
};

module.exports = withGoogleServices;
