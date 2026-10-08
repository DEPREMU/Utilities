import os from "os";
import { Paths } from "./paths";
import MachineId from "node-machine-id";
import { Logger } from "@/utils/logger.ts";
import { DataAppElectron } from "@types";
import { Task, ServiceClass } from "@common";

const logger = new Logger("Variables");

const isWindows = os.platform() === "win32";

const userHome = (process.env.ORIGINAL_HOME ||
  (process.env.SUDO_USER && process.env.SUDO_USER !== "root"
    ? `/home/${process.env.SUDO_USER}`
    : process.env.HOME)) as string;

class DataAppClass extends ServiceClass<Record<string, () => void>> {
  static instance: DataAppClass;

  #dataApp = {} as DataAppElectron;

  public set setDataApp(data: DataAppElectron) {
    this.#dataApp = data;
  }

  #loadData = async (): Promise<DataAppElectron> => {
    const getLocalIP = async () => {
      const task = new Task<string, "GET_LOCAL_IP">({
        abortAfter: 10000,
        fileWorker: "GET_LOCAL_IP",
      });
      const result = await task.getResult();

      let ip = "127.0.0.1";
      if (result instanceof Error) {
        logger.error("Error getting local IP:", result.message);
      } else ip = result;

      return ip;
    };

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
