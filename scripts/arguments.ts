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
import { Helper } from "@commonSrc/both/index.ts";

export type TYPE_ARGS = {
  dev?: boolean;
  fix?: boolean;
  lan?: boolean;
  web?: boolean;
  yes?: boolean;
  check?: boolean;
  action?: string;
  install?: boolean;
  testing?: boolean;
  PLATFORM?: "android" | "web";
  platform?: "linux" | "windows";
  isWindows?: boolean;
  BUILD_PROFILE?: "development" | "preview" | "production";
  "skip-build-android"?: boolean;
  "skip-build-electron"?: boolean;
  "skip-prebuild-android"?: boolean;
  "platform-update-assets"?: "android" | "web" | "both";
};

const showHelp = () => {
  const options: Set<string> = new Set();

  const args = Args.ARGUMENTS;

  if (isBuildUploadAndroid || isAppBuildDev) {
    options.add(args["skip-build-android"].explanation);
  }
  if (isBuildAndroid || isBuildUploadAndroid) {
    options.add(args["BUILD_PROFILE"].explanation);
    options.add(args["skip-prebuild-android"].explanation);
  }
  if (isBuildResourcesElectron) {
    options.add(args["platform"].explanation);
  }
  if (isAppStart) {
    options.add(args["lan"].explanation);
    options.add(args["dev"].explanation);
  }
  if (isAppLint) {
    options.add(args["fix"].explanation);
    options.add(args["check"].explanation);
  }
  if (isUpdate) {
    options.add(args["platform-update-assets"].explanation);
    options.add(args["BUILD_PROFILE"].explanation);
  }
  if (isBuildAppElectron || isAndroidPrebuild) {
    options.add(args["BUILD_PROFILE"].explanation);
  }
  if (isBuildResourcesElectron) {
    options.add(args["isWindows"].explanation);
  }

  // eslint-disable-next-line no-console
  console.log(`Usage: [command] [options]
Options:
${Array.from(options).join("\n")}
${args["yes"].explanation}
${args["testing"].explanation}
  -h, --help                   Show this help message
`);
  process.exit(0);
};

class Args {
  static readonly args = process.argv.slice(2);

  static readonly ARGUMENTS: Record<
    keyof TYPE_ARGS,
    { explanation: string; transformed: string | string[] }
  > = {
    yes: {
      explanation:
        "  -y, --yes                    Automatically answer 'yes' to all prompts and use default values where applicable",
      transformed: ["-y", "--yes"],
    },
    action: {
      explanation:
        "  --action=<action>            Specify the action to perform",
      transformed: "--action",
    },
    dev: {
      explanation: "  --dev                        Run with --dev flag",
      transformed: "--dev",
    },
    fix: {
      explanation: "  --fix                        Run eslint with --fix",
      transformed: "--fix",
    },
    lan: {
      explanation: "  --lan                        Run with --lan flag",
      transformed: "--lan",
    },
    web: {
      explanation: "  --web                        Build web version only",
      transformed: "--web",
    },
    check: {
      explanation:
        "  --check                      Run eslint with --max-warnings 0",
      transformed: "--check",
    },
    install: {
      explanation: "  --install                    Install dependencies",
      transformed: "--install",
    },
    testing: {
      explanation:
        "  -t, --testing                Run in testing mode with additional logging and no side effects",
      transformed: ["-t", "--testing"],
    },
    PLATFORM: {
      explanation:
        "  --PLATFORM=<android|web>     Specify the platform for testing (android or web)",
      transformed: "--PLATFORM",
    },
    platform: {
      explanation:
        "  -p, --platform=<platform>    Specify the platform to build for (windows or linux)",
      transformed: ["-p", "--platform"],
    },
    isWindows: {
      explanation:
        "  --isWindows=<true|false>     Specify if the current platform is Windows (required for build-resources-electron)",
      transformed: "--isWindows",
    },
    BUILD_PROFILE: {
      explanation:
        "  -f, --profile=<profile>      Specify the build profile (development, preview, production)",
      transformed: ["-f", "--profile"],
    },
    "skip-build-android": {
      explanation:
        "  -sba, --skip-build-android   Skip the Android build process and only upload the existing APK",
      transformed: ["-sba", "--skip-build-android"],
    },
    "skip-build-electron": {
      explanation:
        "  -sbe, --skip-build-electron   Skip the Electron app build process and only export the web version",
      transformed: ["-sbe", "--skip-build-electron"],
    },
    "skip-prebuild-android": {
      explanation:
        "  -spa, --skip-prebuild-android   Skip the Android prebuild process and use existing build artifacts",
      transformed: ["-spa", "--skip-prebuild-android"],
    },
    "platform-update-assets": {
      explanation:
        "  -pua, --platform-update-assets=<platform>   Specify the platform to update assets for (android, web, both)",
      transformed: ["-pua", "--platform-update-assets"],
    },
  };

  static Args: Record<keyof TYPE_ARGS, 0> = {
    dev: 0,
    fix: 0,
    lan: 0,
    web: 0,
    yes: 0,
    check: 0,
    action: 0,
    install: 0,
    testing: 0,
    platform: 0,
    PLATFORM: 0,
    isWindows: 0,
    BUILD_PROFILE: 0,
    "skip-build-android": 0,
    "skip-build-electron": 0,
    "skip-prebuild-android": 0,
    "platform-update-assets": 0,
  };

  static readonly showHelp = showHelp;

  ARGS: Readonly<TYPE_ARGS> = {};

  public editArg = <T extends keyof TYPE_ARGS>(
    key: T,
    value: TYPE_ARGS[T],
  ): void => {
    if (Object.isFrozen(this.ARGS)) this.ARGS = { ...this.ARGS, [key]: value };

    (this.ARGS[key] as unknown) = value;

    Object.freeze(this.ARGS);
  };

  #init = () => {
    if (Args.args.includes("-h") || Args.args.includes("--help"))
      Args.showHelp();

    let prevArg = "";
    const argsProcessed: string[] = [];

    const ARGS = Args.args.reduce((acc, arg, index) => {
      const includesEqual = arg.includes("=");
      const isArg = arg.startsWith("-");
      if (!isArg && !prevArg) throw new Error(`Unknown argument: ${arg}`);

      const nextArg = Args.args[index + 1];
      if (isArg && (nextArg?.startsWith("-") || !nextArg))
        switch (arg) {
          case "-sba":
          case "--skip-build-android":
            acc["skip-build-android"] = true;
            return acc;
          case "-spa":
          case "--skip-prebuild-android":
            acc["skip-prebuild-android"] = true;
            return acc;
          case "-sbe":
          case "--skip-build-electron":
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
          case "-t":
          case "--testing":
            acc["testing"] = true;
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
        case "p":
        case "platform":
          if (new Set(["linux", "windows", "both"]).has(value as string)) {
            acc.platform = value as TYPE_ARGS["platform"];
          } else {
            throw new Error(
              `Invalid platform: ${value}. Valid platforms: linux, windows, both`,
            );
          }
          break;
        case "PLATFORM":
          if (new Set(["android", "web"]).has(value as string)) {
            acc.PLATFORM = value as TYPE_ARGS["PLATFORM"];
          } else {
            throw new Error(
              `Invalid platform: ${value}. Valid platforms: android, web`,
            );
          }
          break;
        case "f":
        case "profile":
          if (
            new Set(["development", "preview", "production"]).has(
              value as string,
            )
          ) {
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
        case "pua":
        case "platform-update-assets":
          if (new Set(["android", "web", "both"]).has(value as string)) {
            acc["platform-update-assets"] =
              value as TYPE_ARGS["platform-update-assets"];
          } else {
            throw new Error(
              `Invalid platform for update assets: ${value}. Valid options: android, web, both`,
            );
          }
          break;
        case "isWindows":
          if (new Set(["true", "false"]).has(value as string)) {
            acc.isWindows = value === "true";
          } else {
            throw new Error(
              `Invalid value for isWindows: ${value}. Valid options: true, false`,
            );
          }
          break;
        default:
          throw new Error(`Unknown argument: ${key}`);
      }
      argsProcessed.push(key);
      prevArg = "";

      return acc;
    }, {} as TYPE_ARGS);

    Object.keys(Args.Args).forEach((key) => {
      const refARGS = ARGS as Record<string, unknown>;
      if (refARGS[key] !== undefined) return;
      if (process.env[key] === undefined) return;

      const value = process.env[key];
      if (value === "true" || value === "false") {
        refARGS[key] = value === "true";
      } else if (value === "0" || value === "1") {
        refARGS[key] = value === "1";
      } else {
        refARGS[key] = value;
      }
    });

    this.ARGS = ARGS;
    Object.freeze(this.ARGS);
  };

  public readonly getArgs = () => {
    const argsList: Set<string> = new Set();
    for (const [key, value] of Object.entries(this.ARGS)) {
      const transformedKey = Args.ARGUMENTS[key as keyof TYPE_ARGS].transformed;
      if (value === undefined) continue;
      if (typeof value === "boolean" && !value) continue;

      const keys = Helper.Arrays.convertToArray(transformedKey);

      if (typeof value === "boolean" && value) argsList.add(keys[0]);
      else argsList.add(`${keys[0]}=${value}`);
    }

    return Array.from(argsList).join(" ");
  };

  constructor() {
    this.#init();
  }
}

export const args = new Args();
