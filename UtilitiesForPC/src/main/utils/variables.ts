import os from "os";
import path from "path";
import MachineId from "node-machine-id";
import { app, dialog } from "electron";
import { DataAppElectron } from "@types";
import { Task, ServiceClass } from "@common";

const isWindows = os.platform() === "win32";

const userHome = (process.env.ORIGINAL_HOME ||
  (process.env.SUDO_USER && process.env.SUDO_USER !== "root"
    ? `/home/${process.env.SUDO_USER}`
    : process.env.HOME)) as string;

type ValidPaths = {
  [K in keyof typeof StaticPaths]: (typeof StaticPaths)[K] extends string
    ? K
    : never;
}[keyof typeof StaticPaths];

class StaticPaths {
  static readonly MAIN_PATH = app.isPackaged
    ? path.resolve(process.resourcesPath)
    : path.dirname(__dirname);

  static readonly BUILD = app.isPackaged
    ? path.join(StaticPaths.MAIN_PATH, "app.asar", "build")
    : path.join(StaticPaths.MAIN_PATH, "build");

  static readonly DIST = path.join(StaticPaths.MAIN_PATH, "dist");

  static readonly ASSETS = path.join(StaticPaths.MAIN_PATH, "assets");

  static readonly LOGS = path.join(
    StaticPaths.MAIN_PATH,
    "..",
    "log-utilities-for-pc.txt",
  );

  static readonly DOWNLOADS = path.resolve(app.getPath("downloads"));
}

export class Paths extends StaticPaths {
  static readonly getPath = (
    key: ValidPaths,
    ...segments: string[]
  ): string => {
    return path.join(Paths[key], ...segments);
  };

  static readonly askPath = async (): Promise<string | null> => {
    try {
      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow) return null;

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory", "dontAddToRecent"],
      });
      if (result.canceled) return null;
      if (!result.filePaths.length) return null;

      return result.filePaths[0];
    } catch (error) {
      import("@utils").then(({ Logger }) => {
        Logger.log("Error asking path: ", error);
      });
      return null;
    }
  };
}

const getLocalIP = async () => {
  const task = new Task<string, "GET_LOCAL_IP">({
    abortAfter: 10000,
    fileWorker: "GET_LOCAL_IP",
  });
  const result = await task.getResult();

  let ip = "127.0.0.1";
  if (result instanceof Error) {
    const { Logger } = await import("@/utils/logger.ts");
    Logger.error("Error getting local IP:", result.message);
  } else ip = result;

  return ip;
};

//? Testing zone. getDownloadsPath is not used anywhere, but it might be useful in the future if the app needs to know the default downloads path of the user for any reason and the app.getPath("downloads") doesn't work as expected (electron)
// const getDownloadsPath = async (): Promise<string> => {
//   if (isWindows) return path.resolve(app.getPath("downloads"));

//   let downloadsPath = path.join(userHome, "Downloads");
//   try {
//     const configPath = path.join(userHome, ".config/user-dirs.dirs");
//     const file = new File(configPath);
//     if (await file.exists()) {
//       const content = await file.readFile();
//       const match = content.match(/XDG_DOWNLOAD_DIR="([^"]+)"/);
//       if (match && match[1]) {
//         downloadsPath = match[1].replace("$HOME", userHome);
//       }
//     }
//   } catch (e) {
//     import("@utils").then(({ Logger }) => {
//       Logger.error(
//         "Error reading user-dirs.dirs, using default Downloads path:",
//         e,
//       );
//     });
//   }

//   return downloadsPath;
// };

class DataAppClass extends ServiceClass<Record<string, () => void>> {
  static instance: DataAppClass;

  #dataApp = {} as DataAppElectron;

  public set setDataApp(data: DataAppElectron) {
    this.#dataApp = data;
  }

  #loadData = async (): Promise<DataAppElectron> => {
    const [lanIP, machineId] = await Promise.all([
      getLocalIP(),
      MachineId.machineId(),
    ]);

    return {
      ad: this.#dataApp.ad || null,
      PORT: 3005,
      tray: this.#dataApp.tray || null,
      username: (process.env.ORIGINAL_USER ||
        process.env.SUDO_USER ||
        process.env.USER ||
        process.env.USERNAME) as string,
      lanIP,
      userHome,
      server: this.#dataApp.server || null,
      hasSudo: false,
      deviceId: "",
      preloadPath: Paths.getPath("BUILD", "preload.cjs"),
      language: "en",
      isWindows,
      machineId,
      isUpdating: false,
      wasSleeping: false,
      webRestarted: false,
      downloadFilePath: Paths.getPath(
        "DOWNLOADS",
        `UtilitiesForPC-update.${isWindows ? "exe" : "deb"}`,
      ),
      mainWindow:
        this.#dataApp.mainWindow && !this.#dataApp.mainWindow.isDestroyed()
          ? this.#dataApp.mainWindow
          : null,
      isQuitting: false,
      SERVICE_NAME: "UtilitiesForPC",
      userIsLoggedIn: false,
      clipboardWindow: null,
      clipboardHistory: [],
      reconnectAttempts: 0,
      currentWebVersion: "{{WEB_VERSION}}",
    };
  };

  public setValue = <T extends keyof DataAppElectron>(
    key: T,
    value:
      | DataAppElectron[T]
      | ((prevValue: DataAppElectron[T]) => DataAppElectron[T]),
  ) => {
    if (typeof value === "function") {
      const func = value as (
        prevValue: DataAppElectron[T],
      ) => DataAppElectron[T];
      this.#dataApp[key] = func(this.#dataApp[key]);
      return;
    }
    this.#dataApp[key] = value;
  };

  /**
   * Retrieves a value from the application data store by its key.
   *
   * @template T - A key type that extends the keys of DataAppElectron
   * @param {T} key - The key of the value to retrieve from the data store, if key is "isWindows", this will be replaced while building the app automatically
   * @returns {DataAppElectron[T]} The value associated with the specified key, typed according to the DataAppElectron interface
   */
  public getValue = <T extends keyof DataAppElectron>(
    key: T,
  ): DataAppElectron[T] => {
    return this.#dataApp[key];
  };

  override async _init(): Promise<void> {
    const data = await this.#loadData();
    this.#dataApp = data;
  }

  constructor() {
    super();

    if (DataAppClass.instance) return DataAppClass.instance;
    else DataAppClass.instance = this;

    this._reInit();
  }
}

const dataApp: DataAppClass = new DataAppClass();

export default dataApp;
