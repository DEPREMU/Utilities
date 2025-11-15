import os from "os";
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
let dataAppDefault: DataAppElectron = {
  ad: null,
  PORT: 3005,
  tray: null,
  lanIP: getLocalIP(),
  server: null,
  hasSudo: false,
  deviceId: "",
  language: "en",
  __dirname: path.resolve(),
  isWindows,
  wasSleeping: false,
  webRestarted: false,
  downloadFilePath: path.join(
    app.getPath("downloads"),
    `UtilitiesForPC-Update${isWindows ? ".exe" : ".deb"}`
  ),
  logPath: isWindows
    ? "C:\\Windows\\Temp\\log-utilities-for-pc.txt"
    : "/tmp/log-utilities-for-pc.txt",
  mainWindow: null,
  isQuitting: false,
  SERVICE_NAME: "UtilitiesForPC",
  encryptionKey: machineId.machineIdSync(),
  userIsLoggedIn: false,
  reconnectAttempts: 0,
  currentWebVersion: "{{WEB_VERSION}}",
  currentElectronVersion: "{{ELECTRON_VERSION}}",
};

dataApp = new DataAppClass(dataAppDefault);

export default dataApp;
