import { APP_VERSION, REPLACERS } from "../TOP_LEVEL";
import * as ExpoUpdates from "expo-updates";
import { EventsDeviceInfo } from "./deviceInfo";
import { EventEmitterService } from "@types";
import { ServiceClass } from "@common";

type CheckUpdatesNatively = {
  time: number;
  func: () => Promise<boolean>;
  removeListenerInternet?: EventEmitterService;
};

class Updates extends ServiceClass<never> {
  #idIntervalCheckUpdatesNatively: number | null = null;
  #listenerExpoUpdates: (() => void) | null = null;

  #updateExpo = async () => {
    const { cleanupServices } = await import("@utils");

    const update = await ExpoUpdates.checkForUpdateAsync();
    if (!update.isAvailable) return false;

    await cleanupServices();
    await ExpoUpdates.fetchUpdateAsync();
    await ExpoUpdates.reloadAsync();
  };

  #checkUpdatesNatively: CheckUpdatesNatively = {
    time: 8 * 60 * 60 * 1000,
    func: async () => {
      try {
        const {
          alerts,
          tTyped,
          openURL,
          deviceInfo,
          fetchToServer,
          waitForInternet,
          notificationsManager,
        } = await import("@utils");

        const res = await fetchToServer("/is-update-available", {
          buildType: "android",
          platformOS: undefined,
          currentVersion: APP_VERSION,
        });
        const result = res.data;
        if (!result?.updateAvailable) return false;

        const hasInternet = await waitForInternet(5);
        if (!hasInternet) {
          this.#checkUpdatesNatively.removeListenerInternet =
            deviceInfo.addEventListener(
              EventsDeviceInfo.hasInternetChange,
              (hasInternet) => {
                if (!hasInternet) return;

                this.#checkUpdatesNatively.func();
                this.#checkUpdatesNatively.removeListenerInternet?.remove();
              },
            );
          return false;
        }

        if (deviceInfo.isBackground) {
          notificationsManager.sendNotification({
            type: "info",
            title: tTyped("updateAvailable"),
            message: tTyped("updateAvailableMessage"),
            channelId: "updateAvailable",
            reasonNotification: "updateAvailable",
            overrideNotification: false,
            actions: [
              {
                title: tTyped("updateNow"),
                actionId: "settings",
              },
            ],
          });
        } else {
          await alerts.showAlert(
            "updateAvailable",
            "updateAvailableMessage",
            async (_, accepted) => {
              if (!accepted) return;

              openURL(result.downloadUrl);
            },
          );
        }
        return true;
      } catch (error) {
        const { logger } = await import("@utils");
        logger.error("Error while updating the app", error);
      }

      return false;
    },
  };

  #checkUpdatesExpo = async () => {
    try {
      if (!REPLACERS.isNative) return false;
      const update = await ExpoUpdates.checkForUpdateAsync();
      if (!update.isAvailable) return false;

      const { alerts, notificationsManager, deviceInfo, tTyped } =
        await import("@utils");

      if (!deviceInfo.isBackground) {
        alerts.showAlert(
          "updateAvailable",
          "updateAvailableMessage",
          async (_, accepted) => {
            if (!accepted) return;

            this.#updateExpo();
          },
          { cancelable: true },
        );
      } else {
        notificationsManager.sendNotification({
          title: tTyped("updateAvailable"),
          message: tTyped("updateAvailableMessage"),
          type: "info",
          channelId: "updateAvailable",
          reasonNotification: "updateAvailable",
          overrideNotification: false,
          actions: [
            {
              actionId: "settings",
              title: tTyped("updateNow"),
            },
          ],
        });
      }

      return true;
    } catch (error) {
      const { logger } = await import("@utils");
      logger.error(
        "Error while updating the app with Expo Updates",
        error instanceof Error ? error.message : String(error),
      );
    }

    return false;
  };

  private _initCheckUpdatesExpo = async () => {
    if (!REPLACERS.isNative || REPLACERS.isDev) return;
    if (this.#listenerExpoUpdates) return;

    const { setIntervalPolyfill, clearIntervalPolyfill, deviceInfo } =
      await import("@utils");

    let sub: null | EventEmitterService = null;
    const id = setIntervalPolyfill(
      () => {
        if (deviceInfo.hasInternet) return this.#checkUpdatesExpo();

        if (!sub)
          sub = deviceInfo.addEventListener(
            EventsDeviceInfo.hasInternetChange,
            (hasInternet) => {
              if (!hasInternet) return;

              this.#checkUpdatesExpo();
              sub?.remove();
              sub = null;
            },
          );
      },
      60 * 60 * 1000,
    );

    this.#listenerExpoUpdates = () => clearIntervalPolyfill(id);
  };

  private _initCheckUpdatesNatively = async () => {
    if (!REPLACERS.isNative || REPLACERS.isDev) return;
    if (this.#idIntervalCheckUpdatesNatively) return;

    await this.#checkUpdatesNatively.func();
    const { setIntervalPolyfill } = await import("@utils");
    this.#idIntervalCheckUpdatesNatively = setIntervalPolyfill(
      this.#checkUpdatesNatively.func,
      this.#checkUpdatesNatively.time,
    );
  };

  override _init = async () => {
    await Promise.all([
      this._initCheckUpdatesExpo(),
      this._initCheckUpdatesNatively(),
    ]);
  };

  public checkForUpdates = async () => {
    const updateNatively = await this.#checkUpdatesNatively.func();
    if (updateNatively) return true;

    return await this.#checkUpdatesExpo();
  };

  override async destroy() {
    if (this.#idIntervalCheckUpdatesNatively) {
      const { clearIntervalPolyfill } = await import("@utils");
      clearIntervalPolyfill(this.#idIntervalCheckUpdatesNatively);
      this.#idIntervalCheckUpdatesNatively = null;
    }

    this.#listenerExpoUpdates?.();
    super.destroy();
  }

  constructor() {
    super();
  }
}

export const updates: Updates | null = REPLACERS.isWeb ? null : new Updates();
