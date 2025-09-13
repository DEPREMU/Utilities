const fs = require("fs");
const path = require("path");

const withGoogleServices = (config) => {
  console.log("Plugin handleCreateFiles.js is being executed...");

  if (process.env.EAS_BUILD === "true" && process.env.GOOGLE_SERVICES_JSON) {
    try {
      console.log("Creating google-services.json from environment variable...");

      const projectRoot = config._internal?.projectRoot || process.cwd();
      const googleServicesPath = path.join(projectRoot, "google-services.json");

      console.log("Project root:", projectRoot);
      console.log("Google services path:", googleServicesPath);

      const googleServicesContent = Buffer.from(
        process.env.GOOGLE_SERVICES_JSON,
        "base64",
      ).toString("utf8");

      const parsed = JSON.parse(googleServicesContent);
      console.log(
        "Valid JSON with project_id:",
        parsed.project_info?.project_id,
      );

      fs.writeFileSync(googleServicesPath, googleServicesContent);
      console.log("google-services.json created successfully");

      if (!fs.existsSync(googleServicesPath))
        throw new Error("File was not created successfully");

      console.log("File verified to exist");
      const stats = fs.statSync(googleServicesPath);
      console.log("File size:", stats.size, "bytes");
    } catch (error) {
      console.error("Error creating google-services.json:", error);
      throw error;
    }
  } else if (process.env.EAS_BUILD === "true") {
    console.error(
      "GOOGLE_SERVICES_JSON environment variable not found in EAS Build",
    );
    console.error("Available env vars:", Object.keys(process.env).join("\n"));
    throw new Error(
      "GOOGLE_SERVICES_JSON environment variable is required for EAS builds",
    );
  }

  return config;
};

module.exports = withGoogleServices;
