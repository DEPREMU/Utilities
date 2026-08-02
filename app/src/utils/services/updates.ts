import { APP_VERSION } from "../TOP_LEVEL";
import * as ExpoUpdates from "expo-updates";
import { EventsDeviceInfo } from "./deviceInfo";
import { EventEmitterService } from "@types";
import { Timers, Network, REPLACERS, ServiceClass } from "@common";

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
          ServerFetch,
          notificationsManager,
        } = await import("@utils");

        const res = await ServerFetch.get(
          "/updates/is-update-available/:version/:buildType",
          {
            version: APP_VERSION,
            buildType: "android",
          },
        );
        const result = res.data;
        if (!result?.isUpdateAvailable) return false;

        const hasInternet = await Network.waitForOnline(5);
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
            title: tTyped("updates.updateAvailable"),
            message: tTyped("updates.updateAvailableMessage"),
            channelId: "updateAvailable",
            reasonNotification: "updateAvailable",
            overrideNotification: false,
            actions: [
              {
                title: tTyped("updates.updateNow"),
                actionId: "settings",
              },
            ],
          });
        } else {
          await alerts.showAlert(
            "updates.updateAvailable",
            "updates.updateAvailableMessage",
            async (_, accepted) => {
              if (!accepted || !result?.downloadUrl) return;

              openURL(result.downloadUrl);
            },
          );
        }
        return true;
      } catch (error) {
        REPLACERS.Logger.error("Error while updating the app", error);
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
          "updates.updateAvailable",
          "updates.updateAvailableMessage",
          async (_, accepted) => {
            if (!accepted) return;

            this.#updateExpo();
          },
          { cancelable: true },
        );
      } else {
        notificationsManager.sendNotification({
          title: tTyped("updates.updateAvailable"),
          message: tTyped("updates.updateAvailableMessage"),
          type: "info",
          channelId: "updateAvailable",
          reasonNotification: "updateAvailable",
          overrideNotification: false,
          actions: [
            {
              actionId: "settings",
              title: tTyped("updates.updateNow"),
            },
          ],
        });
      }

      return true;
    } catch (error) {
      REPLACERS.Logger.error(
        "Error while updating the app with Expo Updates",
        error instanceof Error ? error.message : String(error),
      );
    }

    return false;
  };

  private _initCheckUpdatesExpo = async () => {
    if (!REPLACERS.isNative || REPLACERS.isDev) return;
    if (this.#listenerExpoUpdates) return;

    const { deviceInfo } = await import("@utils");

    let sub: null | EventEmitterService = null;
    const id = Timers.setInterval(
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

    this.#listenerExpoUpdates = () => Timers.clearInterval(id);
  };

  private _initCheckUpdatesNatively = async () => {
    if (!REPLACERS.isNative || REPLACERS.isDev) return;
    if (this.#idIntervalCheckUpdatesNatively) return;

    await this.#checkUpdatesNatively.func();
    this.#idIntervalCheckUpdatesNatively = Timers.setInterval(
      this.#checkUpdatesNatively.func,
      this.#checkUpdatesNatively.time,
    );
  };

  override async _init(): Promise<void> {
    await Promise.all([
      this._initCheckUpdatesExpo(),
      this._initCheckUpdatesNatively(),
    ]);
  }

  public checkForUpdates = async () => {
    const updateNatively = await this.#checkUpdatesNatively.func();
    if (updateNatively) return true;

    return await this.#checkUpdatesExpo();
  };

  override async destroy() {
    if (this.#idIntervalCheckUpdatesNatively) {
      Timers.clearInterval(this.#idIntervalCheckUpdatesNatively);
      this.#idIntervalCheckUpdatesNatively = null;
    }

    this.#listenerExpoUpdates?.();
    super.destroy();
  }

  constructor() {
    super();
    this._reInit();
  }
}

export const updates: Updates | null = REPLACERS.isWeb ? null : new Updates();
