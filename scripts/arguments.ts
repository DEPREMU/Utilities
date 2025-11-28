import type * as Types from "@types";

const args = process.argv.slice(2);

export type TYPE_ARGS = {
  platform?: "linux" | "windows" | "both";
  profile?: string;
  "skip-build-android"?: boolean;
  "skip-prebuild-android"?: boolean;
  yes?: boolean;
  lan?: boolean;
  dev?: boolean;
  fix?: boolean;
  web?: boolean;
  check?: boolean;
  action?: string;
  install?: boolean;
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

  if (isBuildUploadAndroid) {
    options.push(
      `  -s, --skip-build-android   Skip the Android build process and only upload the existing APK`
    );
  }
  if (isBuildAndroid || isBuildUploadAndroid) {
    options.push(
      `  -f, --profile=<profile>      Specify the build profile (development, preview, production)`,
      `  -p, --skip-prebuild-android   Skip the Android prebuild process`
    );
  }
  if (isUploadElectron) {
    options.push(
      `  -p, --platform=<platform>    Specify the platform to build for (windows, linux, both)`
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

  console.log(`Usage: [command] [options]
Options:
${options.join("\n")}
  -y, --yes                    Automatically answer 'yes' to all prompts and use default values where applicable
  -h, --help                   Show this help message
`);
};

let prevArg = "";
const argsProcessed: string[] = [];
export const ARGS = args.reduce((acc, arg) => {
  const includesEqual = arg.includes("=");
  const isArg = arg.startsWith("-");
  if (!isArg && !prevArg) throw new Error(`Unknown argument: ${arg}`);

  switch (arg) {
    case "--help":
    case "-h":
      showHelp();
      process.exit(0);
    case "--skip-build-android":
    case "-s":
      acc["skip-build-android"] = true;
      return acc;
    case "--skip-prebuild-android":
    case "-p":
      acc["skip-prebuild-android"] = true;
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
  if (argsProcessed.includes(key)) {
    throw new Error(`Duplicate argument: ${key}`);
  }

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
    default:
      break;
  }
  argsProcessed.push(key);

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
