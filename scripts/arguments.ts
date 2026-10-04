import {
  isUpdate,
  isAppLint,
  isAppStart,
  isAppBuildDev,
  //TODO: Delete if not necessary to build android on github actions.
  // isBuildAndroid,
  isUploadElectron,
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
  isWindows?: boolean;
  TYPE_BUILD?: "clipboard" | "normal" | "test";
  PLATFORM_PC?: "linux" | "windows";
  BUILD_PROFILE?: "development" | "preview" | "production";
  "skip-build-android"?: boolean;
  "skip-build-electron"?: boolean;
  "skip-prebuild-android"?: boolean;
  "platform-update-assets"?: "android" | "web" | "both";
  message?: string;
  ci?: boolean;
};

const showHelp = () => {
  const options: Set<string> = new Set();

  const args = Args.ARGUMENTS;

  if (isBuildUploadAndroid || isAppBuildDev) {
    options.add(args["skip-build-android"].explanation);
  }
  if (
    //TODO: Delete if not necessary to build android on github actions.
    // isBuildAndroid ||
    isBuildUploadAndroid
  ) {
    options.add(args["BUILD_PROFILE"].explanation);
    options.add(args["skip-prebuild-android"].explanation);
  }
  if (isBuildResourcesElectron) {
    options.add(args["PLATFORM_PC"].explanation);
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
    options.add(args["message"].explanation);
  }
  if (isBuildAppElectron || isAndroidPrebuild) {
    options.add(args["BUILD_PROFILE"].explanation);
  }
  if (isUploadElectron) {
    options.add(args["skip-build-electron"].explanation);
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

export class Args {
  static readonly args = process.argv.slice(2);

  static readonly ARGUMENTS: Record<
    keyof TYPE_ARGS,
    { explanation: string; transformed: string | string[] }
  > = {
    TYPE_BUILD: {
      explanation:
        "  -tb, --type-build=<type-build>     Specify the frontend type build (normal, clipboard, test)",
      transformed: ["-tb", "--type-build"],
    },
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
    PLATFORM_PC: {
      explanation:
        "  -pc, --PLATFORM-PC=<platform>    Specify the platform to build for (windows or linux)",
      transformed: ["-pc", "--PLATFORM-PC"],
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
    message: {
      explanation:
        "  -m, --message=<message>      Specify the release message for updates",
      transformed: ["-m", "--message"],
    },
    ci: {
      explanation:
        "  --ci                         Run in CI environment, bypassing prompts",
      transformed: "--ci",
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
    PLATFORM: 0,
    isWindows: 0,
    TYPE_BUILD: 0,
    PLATFORM_PC: 0,
    BUILD_PROFILE: 0,
    "skip-build-android": 0,
    "skip-build-electron": 0,
    "skip-prebuild-android": 0,
    "platform-update-assets": 0,
    message: 0,
    ci: 0,
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

  private static readonly BOOLEAN_FLAGS = new Set<keyof TYPE_ARGS>([
    "skip-build-android",
    "skip-prebuild-android",
    "skip-build-electron",
    "yes",
    "lan",
    "dev",
    "fix",
    "check",
    "install",
    "web",
    "testing",
    "ci",
  ]);

  private static readonly FLAG_MAP: Record<string, keyof TYPE_ARGS> = {
    sba: "skip-build-android",
    "skip-build-android": "skip-build-android",
    spa: "skip-prebuild-android",
    "skip-prebuild-android": "skip-prebuild-android",
    sbe: "skip-build-electron",
    "skip-build-electron": "skip-build-electron",
    y: "yes",
    yes: "yes",
    lan: "lan",
    dev: "dev",
    fix: "fix",
    check: "check",
    install: "install",
    web: "web",
    t: "testing",
    testing: "testing",
    ci: "ci",
    tb: "TYPE_BUILD",
    "type-build": "TYPE_BUILD",
    pc: "PLATFORM_PC",
    PLATFORM_PC: "PLATFORM_PC",
    "PLATFORM-PC": "PLATFORM_PC",
    "platform-pc": "PLATFORM_PC",
    PLATFORM: "PLATFORM",
    platform: "PLATFORM",
    f: "BUILD_PROFILE",
    profile: "BUILD_PROFILE",
    action: "action",
    pua: "platform-update-assets",
    "platform-update-assets": "platform-update-assets",
    isWindows: "isWindows",
    iswindows: "isWindows",
    m: "message",
    message: "message",
  };

  static parse = (argsToParse: string[] = Args.args): TYPE_ARGS => {
    const acc: TYPE_ARGS = {};
    const argsProcessed = new Set<string>();

    for (let i = 0; i < argsToParse.length; i++) {
      const arg = argsToParse[i];
      if (!arg) continue;

      if (!arg.startsWith("-")) {
        if (process.env.NODE_ENV === "test") continue;
        throw new Error(`Unknown argument: ${arg}`);
      }

      const equalIndex = arg.indexOf("=");
      const rawFlag =
        equalIndex !== -1
          ? arg.slice(0, equalIndex).replace(/^-+/, "")
          : arg.replace(/^-+/, "");
      const inlineValue =
        equalIndex !== -1 ? arg.slice(equalIndex + 1) : undefined;

      const canonicalKey = Args.FLAG_MAP[rawFlag];
      if (!canonicalKey) {
        if (process.env.NODE_ENV === "test") continue;
        throw new Error(`Unknown argument: ${rawFlag}`);
      }

      if (argsProcessed.has(canonicalKey)) {
        throw new Error(`Duplicate argument: ${rawFlag}`);
      }

      if (canonicalKey === "message") {
        argsProcessed.add("message");
        const tokens: string[] = [];
        if (inlineValue !== undefined) {
          tokens.push(inlineValue);
        }

        const countChar = (str: string, ch: string) => {
          let count = 0;
          for (let j = 0; j < str.length; j++) {
            if (str[j] === ch) count++;
          }
          return count;
        };

        while (i + 1 < argsToParse.length) {
          const nextArg = argsToParse[i + 1];
          const allTextSoFar = tokens.join(" ");
          const quoteOpen =
            countChar(allTextSoFar, '"') % 2 !== 0 ||
            countChar(allTextSoFar, "'") % 2 !== 0;

          if (!quoteOpen && nextArg.startsWith("-")) {
            break;
          }

          tokens.push(nextArg);
          i++;
        }

        let fullMessage = tokens.join(" ").trim();
        if (
          (fullMessage.startsWith('"') &&
            fullMessage.endsWith('"') &&
            fullMessage.length >= 2) ||
          (fullMessage.startsWith("'") &&
            fullMessage.endsWith("'") &&
            fullMessage.length >= 2)
        ) {
          fullMessage = fullMessage.slice(1, -1);
        }
        acc.message = fullMessage;
        continue;
      }

      if (Args.BOOLEAN_FLAGS.has(canonicalKey)) {
        argsProcessed.add(canonicalKey);
        if (inlineValue !== undefined) {
          (acc[canonicalKey] as boolean) = inlineValue !== "false";
        } else {
          (acc[canonicalKey] as boolean) = true;
        }
        continue;
      }

      argsProcessed.add(canonicalKey);
      let value = inlineValue;
      if (value === undefined) {
        if (i + 1 < argsToParse.length && !argsToParse[i + 1].startsWith("-")) {
          value = argsToParse[++i];
        }
      }

      switch (canonicalKey) {
        case "TYPE_BUILD":
          if (new Set(["clipboard", "normal", "test"]).has(value as string)) {
            acc.TYPE_BUILD = value as TYPE_ARGS["TYPE_BUILD"];
          } else {
            throw new Error(
              `Invalid TYPE_BUILD: ${value}. Valid options: clipboard, normal, test`,
            );
          }
          break;
        case "PLATFORM_PC":
          if (new Set(["linux", "windows", "both"]).has(value as string)) {
            acc.PLATFORM_PC = value as TYPE_ARGS["PLATFORM_PC"];
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
        case "BUILD_PROFILE":
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
          break;
      }
    }

    return acc;
  };

  #init = () => {
    if (Args.args.includes("-h") || Args.args.includes("--help"))
      Args.showHelp();

    const ARGS = Args.parse(Args.args);

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
