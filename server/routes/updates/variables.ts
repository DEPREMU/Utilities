import path from "path";
import chalk from "chalk";
import { v4 } from "uuid";
import { cloneDeep } from "lodash";
import { getEnvValue } from "@/env";
import { REPLACERS, serverPath, UPLOAD_DIR } from "@/config";
import { Directory, File, isNewVersion, Logger } from "@common";
import { BuildTypeUpdates, PlatformsOS, RequestUploadUpdate } from "@types";

new Directory(UPLOAD_DIR).mkdir({ recursive: true });

const extensions = {
  web: ".zip",
  linux: ".deb",
  android: ".apk",
  windows: ".exe",
} as const;

export const getFinalFileName = (
  dataFile: Omit<RequestUploadUpdate, "timestamp">,
) => {
  const extension =
    extensions[dataFile.buildType as keyof typeof extensions] ??
    extensions[dataFile.platformOS as keyof typeof extensions];

  return `${dataFile.version}-${dataFile.buildType}${extension === ".apk" ? "" : `-${dataFile.platformOS}`}${extension}`;
};

type TempUrl = Record<
  string,
  {
    id: string;
    version: string;
    maxTime: number;
    buildType: BuildTypeUpdates;
    platformOS?: PlatformsOS;
  }
>;

type UpdateData = typeof import("./data.json");

class DataUpdates {
  static instance: DataUpdates;

  #file = new File(path.join(serverPath, "routes", "updates", "data.json"));
  #data: UpdateData = {} as never;

  #cleanAPI = getEnvValue("API_URL").endsWith("/")
    ? getEnvValue("API_URL").slice(0, -1)
    : getEnvValue("API_URL");

  #tempUrls: TempUrl = {};

  _intervalId = setInterval(() => {
    const now = Date.now();

    Object.entries(this.#tempUrls).forEach(([id, info]) => {
      if (info.maxTime > now) return;

      delete this.#tempUrls[id];
    });
  }, 60 * 1000);

  public updateDataUploads = async (
    version: string,
    buildType: BuildTypeUpdates,
    platformOS?: PlatformsOS,
  ) => {
    let success = false;
    const data = cloneDeep(this.#data);

    const file = new File(
      path.join(
        UPLOAD_DIR,
        getFinalFileName({
          version,
          buildType,
          platformOS,
        }),
      ),
    );

    try {
      this.#data.old = data.new;

      if (!(await file.exists())) return false;

      const newData: UpdateData["new"]["android"] = {
        version,
        timestamp: Date.now(),
        relativePath: path.relative(serverPath, file.path),
      };

      if (buildType === "android" || buildType === "web") {
        const oldFile = new File(
          path.join(serverPath, this.#data.new[buildType].relativePath),
        );
        if (await oldFile.exists()) await oldFile.rm();

        this.#data.new[buildType] = newData;
      } else {
        if (!platformOS)
          throw new Error("Platform OS is required for non-Android builds");
        const oldFile = new File(
          path.join(serverPath, this.#data.new[platformOS].relativePath),
        );
        if (await oldFile.exists()) await oldFile.rm();

        this.#data.new[platformOS] = newData;
      }
      success =
        REPLACERS.isDev ||
        (await this.#file.writeFile(
          JSON.stringify(this.#data, null, 2),
          "utf-8",
        ));

      return success;
    } catch (error) {
      Logger.error(chalk.red("Error updating data uploads:"), error);
      return false;
    } finally {
      if (!success) {
        this.#data = data;
        await file.rm({ force: true });
      }
    }
  };

  public get data() {
    return this.#data;
  }

  public deleteTempUrl = (id: string) => {
    delete this.#tempUrls[id];
  };

  public getInfoTempUrl = (id: string): TempUrl[string] | null => {
    return this.#tempUrls[id] || null;
  };

  public createTempDownloadUrl = (
    version: string,
    buildType: BuildTypeUpdates,
    platformOS?: PlatformsOS,
  ) => {
    try {
      const id = v4();
      const url = this.#cleanAPI + `/updates/download/${id}`;

      this.#tempUrls[id] = {
        id,
        version,
        buildType,
        platformOS,
        maxTime: Date.now() + 5 * 60 * 1000,
      };

      return url;
    } catch {
      return "";
    }
  };

  public isUpdateAvailable = (
    version: string,
    buildType: BuildTypeUpdates,
    platformOS?: PlatformsOS,
  ): boolean => {
    try {
      const latestVersion = this.getLatestVersion(buildType, platformOS);
      if (!latestVersion) return false;

      return isNewVersion(version, latestVersion);
    } catch (error) {
      Logger.error(chalk.red("Error checking for updates:"), error);
      return true;
    }
  };

  public getLatestVersion = (
    buildType: BuildTypeUpdates,
    platformOS?: PlatformsOS,
  ): string | null => {
    try {
      const data = this.getDataUpdate(buildType, platformOS);
      return data ? data.version : null;
    } catch (error) {
      Logger.error(chalk.red("Error getting latest version:"), error);
      return null;
    }
  };

  public getDataUpdate = (
    buildType: BuildTypeUpdates,
    platformOS?: PlatformsOS,
  ): UpdateData["new"][keyof UpdateData["new"]] | null => {
    try {
      if (buildType === "android" || buildType === "web") {
        return this.#data.new[buildType] ?? null;
      } else {
        if (!platformOS || !(platformOS in this.#data.new)) return null;
        return this.#data.new[platformOS] ?? null;
      }
    } catch (error) {
      Logger.error(chalk.red("Error getting update data:"), error);
      return null;
    }
  };

  constructor() {
    this.#file.readFile("utf-8").then((c) => {
      this.#data = JSON.parse(c);
    });

    if (DataUpdates.instance) return DataUpdates.instance;
    else DataUpdates.instance = this;
  }
}

export const dataUpdates = new DataUpdates();
