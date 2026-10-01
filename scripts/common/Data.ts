import path from "path";
import dotenv from "dotenv";
import { args } from "../arguments";
import type { Script } from "./Script";
import APP_CONFIG_FUNC from "@appSrc/app.config.ts";
import { JsonPackageShape } from "./types";
import { File, getAllPathsSync } from "@commonSrc/serverOrElectron/fs";

interface AndroidData {
  gradleOpts: string;
  appConfig: ReturnType<typeof APP_CONFIG_FUNC>;
}

export class Data {
  #android: AndroidData = {
    gradleOpts: "-Xmx4g -XX:MaxMetaspaceSize=1536m",
    appConfig: APP_CONFIG_FUNC(
      {
        config: {},
        projectRoot: "",
        packageJsonPath: "",
        staticConfigPath: "",
      },
      args.ARGS.BUILD_PROFILE ?? process.env.BUILD_PROFILE ?? "production",
    ),
  };

  public get gradleOpts() {
    return this.#android.gradleOpts;
  }

  public get appConfig() {
    return this.#android.appConfig;
  }

  private data = {} as Record<string, unknown>;
  private packagesJson: Partial<JsonPackageShape> = {};

  public addValue(key: string, value: unknown): Script {
    this.data[key] = value;

    return this as unknown as Script;
  }

  public getValue<K>(key: string): K | undefined {
    return (this.data[key] as K) ?? undefined;
  }

  getPackageJson = async <T extends keyof JsonPackageShape>(
    key: T,
  ): Promise<JsonPackageShape[T]> => {
    let packageJSON = this.packagesJson[key];
    if (packageJSON) return packageJSON;

    packageJSON = JSON.parse(
      await new File(path.join(this.PATHS[key], "package.json")).readFile(),
    );

    this.packagesJson[key] = packageJSON;
    return packageJSON as JsonPackageShape[T];
  };

  readonly PLATFORM = {
    isLinux: process.platform === "linux",
    isWindows: process.platform === "win32",
  };

  readonly PATHS = getAllPathsSync();

  init() {
    dotenv.config({ path: path.resolve(this.PATHS.root, ".env") });
  }

  constructor() {
    this.init();
  }
}
