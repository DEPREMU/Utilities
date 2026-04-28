import { ResponseDebugAppAlive } from "@types";
import { REPLACERS } from "../TOP_LEVEL";
import { DEBUG_SETTINGS, ServiceClass } from "@common";

type ListenersDebug = {
  appAliveCheck:
    | ((status: "sent") => void)
    | ((status: "error", error: Error) => void)
    | ((status: "result", result: ResponseDebugAppAlive | null) => void);
};

const TAG = "DEBUG_SERVICE";

class Debug extends ServiceClass<ListenersDebug> {
  #defaultSettings: DEBUG_SETTINGS = {
    appAliveCheck: false,
  };

  #intervals: Record<keyof ListenersDebug, number | null> = {
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

      this.emit("appAliveCheck", "sent");
      try {
        const res = await fetchToServer("/debug/appAlive", {
          deviceId: storageManagement.get("DEVICE_ID"),
          pushToken,
        });
        logger.log(TAG, "App alive check result:", res.data || res.errorText);
        this.emit("appAliveCheck", "result", res.data ?? null);
      } catch (error) {
        logger.error(
          TAG,
          "Error occurred while checking app alive status:",
          error,
        );
        this.emit(
          "appAliveCheck",
          "error",
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    },
  };

  public toggleInterval = async (
    name: keyof ListenersDebug,
  ): Promise<boolean> => {
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

  override _init = async () => {
    const { storageManagement, logger, waitForTime } = await import("@utils");

    try {
      await storageManagement.waitUntilInitialized();
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
    }
  };

  override async destroy() {
    const { clearIntervalPolyfill } = await import("@utils");
    Object.values(this.#intervals).forEach((interval) => {
      if (typeof interval === "number") clearIntervalPolyfill(interval);
    });
    super.destroy();
  }

  constructor() {
    super();
  }
}

export const debug: Debug | null = REPLACERS.isProduction ? null : new Debug();
