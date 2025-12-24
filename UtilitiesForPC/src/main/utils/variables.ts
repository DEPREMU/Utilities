import os from "os";
import fs from "fs";
import path from "path";
import { app } from "electron";
import machineId from "node-machine-id";
import { writeLog } from "./logger";
import { DataAppElectron } from "@types";

let dataApp: DataAppClass = null as unknown as DataAppClass;

const getLocalIP = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === "IPv4" && !iface.internal) {
        if (dataApp) writeLog(`Found local IP: ${iface.address}`, "info");
        return iface.address;
      }
    }
  }

  if (dataApp) writeLog("Failed to find local IP, using 127.0.0.1", "warn");
  return "127.0.0.1";
};

class DataAppClass {
  private dataApp: DataAppElectron;

  public setValue = <T extends keyof DataAppElectron>(
    key: T,
    value:
      | DataAppElectron[T]
      | ((prevValue: DataAppElectron[T]) => DataAppElectron[T])
  ) => {
    if (typeof value === "function") {
      const func = value as (
        prevValue: DataAppElectron[T]
      ) => DataAppElectron[T];
      this.dataApp[key] = func(this.dataApp[key]);
      return;
    }
    this.dataApp[key] = value;
  };

  /**
   * Retrieves a value from the application data store by its key.
   *
   * @template T - A key type that extends the keys of DataAppElectron
   * @param {T} key - The key of the value to retrieve from the data store, if key is "isWindows", this will be replaced while building the app automatically
   * @returns {DataAppElectron[T]} The value associated with the specified key, typed according to the DataAppElectron interface
   */
  public getValue = <T extends keyof DataAppElectron>(
    key: T
  ): DataAppElectron[T] => {
    return this.dataApp[key];
  };

  constructor(data: DataAppElectron) {
    this.dataApp = data;
  }
}

const isWindows = os.platform() === "win32";

const userHome = (process.env.ORIGINAL_HOME ||
  (process.env.SUDO_USER && process.env.SUDO_USER !== "root"
    ? `/home/${process.env.SUDO_USER}`
    : process.env.HOME)) as string;

const getDownloadsPath = (): string => {
  if (isWindows)
    return path.join(app.getPath("downloads"), `UtilitiesForPC-Update.exe`);

  let downloadsPath = path.join(userHome, "Downloads");
  try {
    const configPath = path.join(userHome, ".config/user-dirs.dirs");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf8");
      const match = content.match(/XDG_DOWNLOAD_DIR="([^"]+)"/);
      if (match && match[1]) {
        writeLog(`Found Downloads path in user-dirs.dirs: ${match[1]}`, "info");
        downloadsPath = match[1].replace("$HOME", userHome);
      }
    }
  } catch (e) {
    writeLog(
      "Error reading user-dirs.dirs, using default Downloads path" +
        (e instanceof Error ? `: ${e.message}` : String(e)),
      "warn"
    );
  }

  writeLog(`Using Downloads path: ${downloadsPath}`, "info");
  return path.join(downloadsPath, "UtilitiesForPC-Update.deb");
};

let dataAppDefault: DataAppElectron = {
  ad: null,
  PORT: 3005,
  tray: null,
  username: (process.env.ORIGINAL_USER ||
    process.env.SUDO_USER ||
    process.env.USER ||
    process.env.USERNAME) as string,
  userHome,
  lanIP: getLocalIP(),
  server: null,
  hasSudo: false,
  logPath: path.join(process.resourcesPath, "..", "log-utilities-for-pc.txt"),
  deviceId: "",
  preloadPath: app.isPackaged
    ? path.join(process.resourcesPath, "preload.cjs")
    : path.join(path.dirname(__dirname), "build", "preload.cjs"),
  language: "en",
  isWindows,
  __dirname: path.resolve(),
  machineId: machineId.machineIdSync(),
  isUpdating: false,
  wasSleeping: false,
  webRestarted: false,
  downloadFilePath: getDownloadsPath(),
  mainWindow: null,
  isQuitting: false,
  SERVICE_NAME: "UtilitiesForPC",
  userIsLoggedIn: false,
  clipboardWindow: null,
  clipboardHistory: [],
  reconnectAttempts: 0,
  currentWebVersion: "{{WEB_VERSION}}",
  currentElectronVersion: "{{ELECTRON_VERSION}}",
};

dataApp = new DataAppClass(dataAppDefault);

export default dataApp;
