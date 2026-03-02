import { APP_VERSION, REPLACERS } from "../TOP_LEVEL";
import * as ExpoUpdates from "expo-updates";
import { EventsDeviceInfo } from "./deviceInfo";

type CheckUpdatesNatively = {
  time: number;
  func: () => Promise<void>;
  removeListenerInternet?: () => void;
};

class Updates {
  #initialized = false;
  #initPromise: Promise<void> | null = null;

  #idIntervalCheckUpdatesNatively: number | null = null;
  #listenerExpoUpdates: ReturnType<
    typeof ExpoUpdates.addUpdatesStateChangeListener
  > | null = null;

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
        if (!result?.updateAvailable) return;

        const hasInternet = await waitForInternet(5);
        if (!hasInternet) {
          this.#checkUpdatesNatively.removeListenerInternet =
            deviceInfo.addEventListener(
              EventsDeviceInfo.hasInternetChange,
              (hasInternet) => {
                if (!hasInternet) return;

                this.#checkUpdatesNatively.func();
                this.#checkUpdatesNatively.removeListenerInternet?.();
              },
            );
          return;
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
      } catch (error) {
        const { logger } = await import("@utils");
        logger.error("Error while updating the app", error);
      }
    },
  };

  private _initCheckUpdatesExpo = async () => {
    if (!REPLACERS.isNative) return;
    if (this.#listenerExpoUpdates) return;
    if (APP_VERSION.includes("dev")) return; // Skip updates for testing builds

    const sub = ExpoUpdates.addUpdatesStateChangeListener(async (event) => {
      if (!event.context.isUpdateAvailable) return;

      const { alerts, notificationsManager, deviceInfo, tTyped } =
        await import("@utils");

      if (!deviceInfo.isBackground) {
        alerts.showAlert(
          "updateAvailable",
          "updateAvailableMessage",
          async (_, accepted) => {
            if (!accepted) return;

            await ExpoUpdates.fetchUpdateAsync();
            await ExpoUpdates.reloadAsync();
          },
          {
            cancelable: true,
            addDoNotAskAgain: false,
          },
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
    });

    this.#listenerExpoUpdates = sub;
  };

  private _initCheckUpdatesNatively = async () => {
    if (!REPLACERS.isNative) return;
    if (this.#idIntervalCheckUpdatesNatively) return;
    if (APP_VERSION.includes("dev")) return; // Skip updates for testing builds

    await this.#checkUpdatesNatively.func();
    const { setIntervalPolyfill } = await import("@utils");
    this.#idIntervalCheckUpdatesNatively = setIntervalPolyfill(
      this.#checkUpdatesNatively.func,
      this.#checkUpdatesNatively.time,
    );
  };

  private _init = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    await Promise.all([
      this._initCheckUpdatesExpo(),
      this._initCheckUpdatesNatively(),
    ]);
    this.#initialized = true;
    this.#initPromise = null;
  };

  public cleanup = async () => {
    const { clearIntervalPolyfill } = await import("@utils");

    if (this.#idIntervalCheckUpdatesNatively) {
      clearIntervalPolyfill(this.#idIntervalCheckUpdatesNatively);
      this.#idIntervalCheckUpdatesNatively = null;
    }

    this.#listenerExpoUpdates?.remove();
  };

  constructor() {
    this.#initPromise = this._init();
  }
}

export const updates: Updates | null = REPLACERS.isWeb ? null : new Updates();
