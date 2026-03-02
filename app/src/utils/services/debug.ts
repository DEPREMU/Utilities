import { REPLACERS } from "../TOP_LEVEL";
import { DEBUG_SETTINGS } from "@common";

type Intervals = "appAliveCheck";

const TAG = "DEBUG_SERVICE";

class Debug {
  #initialized = false;
  #initPromise: Promise<void> | null = null;

  #defaultSettings: DEBUG_SETTINGS = {
    appAliveCheck: false,
  };

  #intervals: Record<Intervals, number | null> = {
    appAliveCheck: null,
  };

  public getSettings = async () => {
    const { storageManagement } = await import("@utils");
    return storageManagement.get("DEBUG", this.#defaultSettings);
  };

  #appAliveCheck = {
    timer: 60 * 1000,
    func: async () => {
      const { fetchToServer, getDevicePushToken, storageManagement, logger } =
        await import("@utils");

      const pushToken = await getDevicePushToken();

      const res = await fetchToServer("/debug/appAlive", {
        deviceId: storageManagement.get("DEVICE_ID"),
        pushToken,
      });
      logger.log(TAG, "App alive check result:", res.data || res.errorText);
    },
  };

  public toggleInterval = async (name: Intervals): Promise<boolean> => {
    const { setIntervalPolyfill, clearIntervalPolyfill, storageManagement } =
      await import("@utils");

    switch (name) {
      case "appAliveCheck": {
        const exists = typeof this.#intervals[name] === "number";

        if (exists) {
          clearIntervalPolyfill(this.#intervals[name]);
          this.#intervals[name] = null;
        } else {
          this.#intervals[name] = setIntervalPolyfill(
            this.#appAliveCheck.func,
            this.#appAliveCheck.timer,
          );
        }
        const prevSettings = storageManagement.get(
          "DEBUG",
          this.#defaultSettings,
        );
        prevSettings.appAliveCheck = !exists;
        storageManagement.save("DEBUG", prevSettings);

        return !exists;
      }
      default:
        return false;
    }
  };

  private _initAppAliveCheck = async () => {
    const { storageManagement, setIntervalPolyfill } = await import("@utils");
    const debugSettings: DEBUG_SETTINGS =
      storageManagement.get("DEBUG") || this.#defaultSettings;

    if (!debugSettings.appAliveCheck) return;

    this.#intervals.appAliveCheck = setIntervalPolyfill(
      this.#appAliveCheck.func,
      this.#appAliveCheck.timer,
    );
  };

  private _init = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;
    const { storageManagement, logger, waitForTime } = await import("@utils");

    try {
      await storageManagement.waitUntilLoaded();
      const data = storageManagement.get("DEBUG");
      if (!data) {
        storageManagement.save("DEBUG", this.#defaultSettings);
      }
      await waitForTime(1000);

      await Promise.all([this._initAppAliveCheck()]);
    } catch (error) {
      logger.error(
        "Error initializing Debug service",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      this.#initialized = true;
      this.#initPromise = null;
    }
  };

  public cleanup = async () => {
    const { clearIntervalPolyfill } = await import("@utils");
    Object.values(this.#intervals).forEach((interval) => {
      if (typeof interval === "number") clearIntervalPolyfill(interval);
    });
  };

  constructor() {
    this.#initPromise = this._init();
  }
}

export const debug: Debug | null = REPLACERS.isProduction ? null : new Debug();
