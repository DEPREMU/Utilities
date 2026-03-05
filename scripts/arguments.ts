import {
  isUpdate,
  isAppLint,
  isAppStart,
  isAppBuildDev,
  isBuildAndroid,
  isAndroidPrebuild,
  isBuildAppElectron,
  isBuildUploadAndroid,
  isBuildResourcesElectron,
} from "./filesCalled.ts";

const args = process.argv.slice(2);

export const Args: Record<keyof TYPE_ARGS, 0> = {
  dev: 0,
  fix: 0,
  lan: 0,
  web: 0,
  yes: 0,
  check: 0,
  action: 0,
  install: 0,
  platform: 0,
  isWindows: 0,
  BUILD_PROFILE: 0,
  "skip-build-android": 0,
  "skip-build-electron": 0,
  "skip-prebuild-android": 0,
  "platform-update-assets": 0,
};

export type TYPE_ARGS = {
  dev?: boolean;
  fix?: boolean;
  lan?: boolean;
  web?: boolean;
  yes?: boolean;
  check?: boolean;
  action?: string;
  install?: boolean;
  platform?: "linux" | "windows";
  isWindows?: boolean;
  BUILD_PROFILE?: "development" | "preview" | "production";
  "skip-build-android"?: boolean;
  "skip-build-electron"?: boolean;
  "skip-prebuild-android"?: boolean;
  "platform-update-assets"?: "android" | "web" | "both";
};

type ArgumentsExplanationType =
  | "dev"
  | "fix"
  | "lan"
  | "web"
  | "check"
  | "profile"
  | "install"
  | "platform"
  | "isWindows"
  | "skip-build-android"
  | "skip-build-electron"
  | "skip-prebuild-android"
  | "platform-update-assets";

const ArgumentsExplanation: Record<ArgumentsExplanationType, string> = {
  "skip-build-android":
    "  -sba, --skip-build-android   Skip the Android build process and only upload the existing APK",
  profile:
    "  -f, --profile=<profile>      Specify the build profile (development, preview, production)",
  platform:
    "  -p, --platform=<platform>    Specify the platform to build for (windows or linux)",
  "skip-build-electron":
    "  -sbe, --skip-build-electron   Skip the Electron app build process and only export the web version",
  "platform-update-assets":
    "  -pua, --platform-update-assets=<platform>   Specify the platform to update assets for (android, web, both)",
  "skip-prebuild-android":
    "  -spa, --skip-prebuild-android   Skip the Android prebuild process and use existing build artifacts",
  isWindows:
    "  --isWindows=<true|false>     Specify if the current platform is Windows (required for build-resources-electron)",
  dev: "  --dev                        Run with --dev flag",
  fix: "  --fix                        Run eslint with --fix",
  lan: "  --lan                        Run with --lan flag",
  web: "  --web                        Build web version only",
  check: "  --check                      Run eslint with --max-warnings 0",
  install: "  --install                    Install dependencies",
};

const showHelp = () => {
  const options: string[] = [];

  if (isBuildUploadAndroid || isAppBuildDev) {
    options.push(ArgumentsExplanation["skip-build-android"]);
  }
  if (isBuildAndroid || isBuildUploadAndroid) {
    options.push(
      ArgumentsExplanation["profile"],
      ArgumentsExplanation["skip-prebuild-android"],
    );
  }
  if (isBuildResourcesElectron) {
    options.push(ArgumentsExplanation["platform"]);
  }
  if (isAppStart) {
    options.push(ArgumentsExplanation["lan"], ArgumentsExplanation["dev"]);
  }
  if (isAppLint) {
    options.push(ArgumentsExplanation["fix"], ArgumentsExplanation["check"]);
  }
  if (isUpdate) {
    options.push(
      ArgumentsExplanation["platform-update-assets"],
      ArgumentsExplanation["profile"],
    );
  }
  if (isBuildAppElectron || isAndroidPrebuild) {
    options.push(ArgumentsExplanation["profile"]);
  }
  if (isBuildResourcesElectron) {
    options.push(ArgumentsExplanation["isWindows"]);
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

if (args.includes("-h") || args.includes("--help")) {
  showHelp();
  process.exit(0);
}

export const ARGS = args.reduce((acc, arg, index) => {
  const includesEqual = arg.includes("=");
  const isArg = arg.startsWith("-");
  if (!isArg && !prevArg) throw new Error(`Unknown argument: ${arg}`);

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
        acc.platform = value as TYPE_ARGS["platform"];
      } else {
        throw new Error(
          `Invalid platform: ${value}. Valid platforms: linux, windows, both`,
        );
      }
      break;
    case "profile":
    case "f":
      if (["development", "preview", "production"].includes(value as string)) {
        acc.BUILD_PROFILE = value as TYPE_ARGS["BUILD_PROFILE"];
      } else {
        throw new Error(
          `Invalid profile: ${value}. Valid profiles: development, preview, production`,
        );
      }
      break;
    case "action":
      acc.action = value as TYPE_ARGS["action"];
      break;
    case "platform-update-assets":
    case "pua":
      if (["android", "web", "both"].includes(value as string)) {
        acc["platform-update-assets"] =
          value as TYPE_ARGS["platform-update-assets"];
      } else {
        throw new Error(
          `Invalid platform for update assets: ${value}. Valid options: android, web, both`,
        );
      }
      break;
    case "isWindows":
      if (["true", "false"].includes(value as string)) {
        acc.isWindows = value === "true";
      } else {
        throw new Error(
          `Invalid value for isWindows: ${value}. Valid options: true, false`,
        );
      }
      break;
    default:
      break;
  }
  argsProcessed.push(key);
  prevArg = "";

  return acc;
}, {} as TYPE_ARGS);
Object.keys(Args).forEach((key) => {
  const refARGS = ARGS as Record<string, unknown>;
  if (refARGS[key] !== undefined) return;
  if (process.env[key] === undefined) return;

  const value = process.env[key];
  if (value === "true" || value === "false") {
    refARGS[key] = value === "true";
  } else {
    refARGS[key] = value;
  }
});

export const getArgs = () => {
  const argsList: string[] = [];
  for (const [key, value] of Object.entries(ARGS)) {
    if (typeof value === "boolean" && value) argsList.push(`--${key}`);
    else argsList.push(`--${key}=${value}`);
  }

  return argsList.join(" ");
};
