import type * as Types from "@types";

const args = process.argv.slice(2);

export type TYPE_ARGS = {
  platform?: "linux" | "windows" | "both";
  profile?: string;
  "skip-build-android"?: boolean;
  "skip-build-electron"?: boolean;
  "skip-prebuild-android"?: boolean;
  "platform-update-assets"?: "android" | "web" | "both";
  yes?: boolean;
  lan?: boolean;
  dev?: boolean;
  fix?: boolean;
  web?: boolean;
  check?: boolean;
  action?: string;
  install?: boolean;
  isWindows?: boolean;
  "export-web"?: boolean;
};

const showHelp = () => {
  const fileCalled = process.argv[1].split("/").pop();
  console.log(`Parsing arguments for script: ${fileCalled}`);
  const options: string[] = [];

  const isBuildAndroid = fileCalled?.includes("build-android");
  const isUploadElectron = fileCalled?.includes("build-upload-electron");
  const isBuildUploadAndroid = fileCalled?.includes("build-upload-android");
  const isAppLint = fileCalled?.includes("app-lint");
  const isAppStart = fileCalled?.includes("app-start");
  const isAppClean = fileCalled?.includes("app-clean");
  const isUpdate = fileCalled?.includes("update");
  const isBuildAppElectron = fileCalled?.includes("build-app-electron");
  const isBuildResourcesElectron = fileCalled?.includes(
    "build-resources-electron"
  );

  if (isBuildUploadAndroid) {
    options.push(
      `  -sba, --skip-build-android   Skip the Android build process and only upload the existing APK`
    );
  }
  if (isBuildAndroid || isBuildUploadAndroid) {
    options.push(
      `  -f, --profile=<profile>      Specify the build profile (development, preview, production)`,
      `  -spa, --skip-prebuild-android   Skip the Android prebuild process`
    );
  }
  if (isUploadElectron || isBuildAppElectron) {
    options.push(
      `  -p, --platform=<platform>    Specify the platform to build for (windows, linux, both)
  -sbe, --skip-build-electron   Skip the Electron app build process and only export the web version`
    );
  }
  if (isAppStart) {
    options.push(
      `  --lan                        Run with --lan flag`,
      `  --dev                        Run with -d flag (development mode)`
    );
  }
  if (isAppClean) {
    options.push(
      `  --install                    Run npm install after cleaning`
    );
  }
  if (isAppLint) {
    options.push(
      `  --fix                        Run eslint with --fix`,
      `  --check                      Run eslint with --max-warnings 0`
    );
  }
  if (isUpdate) {
    options.push(
      `  -pua, --platform-update-assets=<platform>   Specify the platform assets to update (android, web, both)
  -f, --profile=<profile>      Specify the profile for the update (development, preview, production)`
    );
  }
  if (isBuildAppElectron) {
    options.push(
      `  --export-web                 Export web version of the Electron app and skip building the Electron app`
    );
  }
  if (isBuildResourcesElectron) {
    options.push(
      `  --isWindows                  Specify if the build is for Windows (true/false)`
    );
  }

  console.log(`Usage: [command] [options]
Options:
${options.join("\n")}
  -y, --yes                    Automatically answer 'yes' to all prompts and use default values where applicable
  -h, --help                   Show this help message
`);
};

let prevArg = "";
const argsProcessed: string[] = [];
export const ARGS = args.reduce((acc, arg, index) => {
  const includesEqual = arg.includes("=");
  const isArg = arg.startsWith("-");
  if (!isArg && !prevArg) throw new Error(`Unknown argument: ${arg}`);

  if (["-h", "--help"].includes(arg)) {
    showHelp();
    process.exit(0);
  }

  const nextArg = args[index + 1];
  if (isArg && (nextArg?.startsWith("-") || !nextArg))
    switch (arg) {
      case "--skip-build-android":
      case "-sba":
        acc["skip-build-android"] = true;
        return acc;
      case "--skip-prebuild-android":
      case "-spa":
        acc["skip-prebuild-android"] = true;
        return acc;
      case "--skip-build-electron":
      case "-sbe":
        acc["skip-build-electron"] = true;
        return acc;
      case "-y":
      case "--yes":
        acc["yes"] = true;
        return acc;
      case "--lan":
        acc["lan"] = true;
        return acc;
      case "--dev":
        acc["dev"] = true;
        return acc;
      case "--fix":
        acc["fix"] = true;
        return acc;
      case "--check":
        acc["check"] = true;
        return acc;
      case "--install":
        acc["install"] = true;
        return acc;
      case "--web":
        acc["web"] = true;
        return acc;
      default:
        break;
    }

  let key = "";
  let value: unknown = "";

  if (includesEqual) {
    if (arg.startsWith("--")) [key, value] = arg.slice(2).split("=");
    else if (arg.startsWith("-")) [key, value] = arg.slice(1).split("=");
  } else if (prevArg) {
    key = prevArg;
    value = arg;
  } else {
    prevArg = arg.replace(/^-+/, "");
  }

  if (!key) return acc;
  if (argsProcessed.includes(key))
    throw new Error(`Duplicate argument: ${key}`);

  switch (key) {
    case "platform":
    case "p":
      if (["linux", "windows", "both"].includes(value as string)) {
        acc.platform = value as "linux" | "windows" | "both";
      } else {
        throw new Error(
          `Invalid platform: ${value}. Valid platforms: linux, windows, both`
        );
      }
      break;
    case "profile":
    case "f":
      if (["development", "preview", "production"].includes(value as string)) {
        acc.profile = value as string;
      } else {
        throw new Error(
          `Invalid profile: ${value}. Valid profiles: development, preview, production`
        );
      }
      break;
    case "action":
      acc.action = value as string;
      break;
    case "platform-update-assets":
    case "pua":
      if (["android", "web", "both"].includes(value as string)) {
        acc["platform-update-assets"] = value as "android" | "web" | "both";
      } else {
        throw new Error(
          `Invalid platform for update assets: ${value}. Valid options: android, web, both`
        );
      }
      break;
    case "isWindows":
      if (["true", "false"].includes(value as string)) {
        acc.isWindows = value === "true";
      } else {
        throw new Error(
          `Invalid value for isWindows: ${value}. Valid options: true, false`
        );
      }
    default:
      break;
  }
  argsProcessed.push(key);
  prevArg = "";

  return acc;
}, {} as TYPE_ARGS);

export const getArgs = () => {
  const argsList: string[] = [];
  for (const [key, value] of Object.entries(ARGS)) {
    if (typeof value === "boolean" && value) argsList.push(`--${key}`);
    else argsList.push(`--${key}=${value}`);
  }

  return argsList.join(" ");
};
