import path from "path";
import chalk from "chalk";
import { v4 } from "uuid";
import { prisma } from "@/database/postgres";
import { getRoutes } from "@/config";
import { Prisma, RequestUploadUpdate } from "@types";
import { File, Logger, ServerFetch, Validations } from "@common";

const extensions = {
  web: "web-{{version}}.zip",
  linux: "linux-{{version}}.deb",
  android: "android-{{version}}.apk",
  windows: "windows-{{version}}.exe",
} as const satisfies Record<DB["Enums"]["UpdateType"], string>;

export const getFinalFileName = (
  dataFile: Omit<RequestUploadUpdate, "timestamp">,
) => {
  const filename = extensions[dataFile.buildType].replace(
    "{{version}}",
    dataFile.version,
  );

  return filename;
};

type TempUrl = Map<
  string,
  {
    id: string;
    version: string;
    maxTime: number;
    buildType: DB["Enums"]["UpdateType"];
  }
>;

type Data = Prisma.UpdatesDataGetPayload<true>;

class DataUpdates {
  static instance: DataUpdates;

  #data: Data[] = [];

  #tempUrls: TempUrl = new Map();

  _intervalId = setInterval(() => {
    const now = Date.now();

    this.#tempUrls.forEach((info, id) => {
      if (info.maxTime > now) return;

      this.#tempUrls.delete(id);
    });
  }, 60 * 1000);

  public updateDataUploads = async (
    version: string,
    buildType: Data["type"],
  ) => {
    const file = new File(
      path.join(
        getRoutes("UPLOAD_DIR"),
        getFinalFileName({
          version,
          buildType,
        }),
      ),
    );

    try {
      if (!(await file.exists())) return false;

      const data = await prisma.updatesData.create({
        data: {
          version,
          type: buildType,
          relativeFilePath: path.relative(getRoutes("ROOT"), file.path),
        },
      });

      return !!data.id;
    } catch (error) {
      Logger.error(chalk.red("Error updating data uploads:"), error);
      return false;
    }
  };

  public get data() {
    return this.#data;
  }

  public deleteTempUrl = (id: string) => {
    this.#tempUrls.delete(id);
  };

  public getInfoTempUrl = (id: string): ReturnType<TempUrl["get"]> => {
    return this.#tempUrls.get(id);
  };

  public createTempDownloadUrl = (version: string, buildType: Data["type"]) => {
    try {
      const id = v4();
      const url = ServerFetch.getRoute("GET", "/updates/download/:id", {
        params: { id },
      });

      this.#tempUrls.set(id, {
        id,
        version,
        buildType,

        maxTime: Date.now() + 5 * 60 * 1000,
      });

      return url;
    } catch {
      return "";
    }
  };

  public isUpdateAvailable = (
    version: string,
    buildType: Data["type"],
  ): boolean => {
    try {
      const latestVersion = this.getLatestVersion(buildType);
      if (!latestVersion) return false;

      return Validations.isNewVersion(version, latestVersion);
    } catch (error) {
      Logger.error(chalk.red("Error checking for updates:"), error);
      return true;
    }
  };

  public getLatestVersion = (buildType: Data["type"]): string | null => {
    try {
      const data = this.getDataUpdate(buildType);
      return data ? data.version : null;
    } catch (error) {
      Logger.error(chalk.red("Error getting latest version:"), error);
      return null;
    }
  };

  public getDataUpdate = (buildType: Data["type"]): Data | null => {
    try {
      return this.#data.find((u) => u.type === buildType) ?? null;
    } catch (error) {
      Logger.error(chalk.red("Error getting update data:"), error);
      return null;
    }
  };

  constructor() {
    prisma.updatesData.findMany().then((data) => {
      this.#data = data;
    });

    if (DataUpdates.instance) return DataUpdates.instance;
    else DataUpdates.instance = this;
  }
}

export const dataUpdates = new DataUpdates();
