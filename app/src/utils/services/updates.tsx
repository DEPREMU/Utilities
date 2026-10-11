import Button from "@components/Button/screens";
import { modalRef } from "@refs";
import { APP_VERSION } from "../TOP_LEVEL";
import * as ExpoUpdates from "expo-updates";
import { View, StyleSheet } from "react-native";
import { EventsDeviceInfo } from "./deviceInfo";
import { Text, ProgressBar } from "react-native-paper";
import { EventEmitterService } from "@types";
import React, { useEffect, useState } from "react";
import { File, Directory, Paths, DownloadTask } from "expo-file-system";
import { Timers, Network, REPLACERS, ServiceClass, Validations } from "@common";

type CheckUpdatesNatively = {
  time: number;
  func: () => Promise<boolean>;
  removeListenerInternet?: EventEmitterService;
};

interface ProgressSubscriberProps {
  subscribe: (callback: (percentage: number) => void) => () => void;
}

const UpdateProgressContent: React.FC<ProgressSubscriberProps> = ({
  subscribe,
}) => {
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    return subscribe((p) => {
      setPercentage(p);
    });
  }, [subscribe]);

  return (
    <View style={styles.progressContainer}>
      <Text
        variant="titleMedium"
        style={styles.percentageText}
        children={`${percentage}%`}
      />
      <ProgressBar
        progress={percentage / 100}
        color="#2196F3"
        style={styles.progressBar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
  },
  percentageText: {
    marginBottom: 12,
    fontWeight: "bold",
    fontSize: 18,
  },
  progressBar: {
    width: "100%",
    height: 10,
    borderRadius: 5,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
    width: "100%",
  },
  modalBodyText: {
    marginVertical: 8,
  },
});

class Updates extends ServiceClass<never> {
  #idIntervalCheckUpdatesNatively: number | null = null;
  #listenerExpoUpdates: (() => void) | null = null;
  #activeDownloadTask: DownloadTask | null = null;
  #pendingDownloadedApk: { filePath: string; version: string } | null = null;
  #resumeListener: EventEmitterService | null = null;
  #isCheckingUpdates = false;
  #isDownloading = false;

  #updateExpo = async () => {
    const { cleanupServices } = await import("@utils");

    const update = await ExpoUpdates.checkForUpdateAsync();
    if (!update.isAvailable) return false;

    await cleanupServices();
    await ExpoUpdates.fetchUpdateAsync();
    await ExpoUpdates.reloadAsync();
  };

  /**
   * Prunes cached update APKs whose version is equal to or lower than the current app version.
   */
  public pruneStaleUpdateCache = async (): Promise<void> => {
    if (!REPLACERS.isNative) return;

    try {
      const updatesDir = new Directory(Paths.cache, "updates");
      if (!updatesDir.exists) return;

      const files = updatesDir.list();
      for (const file of files) {
        if (file instanceof File && file.name.endsWith(".apk")) {
          const match = file.name.match(/^(.*?)\.apk$/);
          if (match) {
            const fileVersion = match[1];
            if (
              Validations.getSumVersion(fileVersion) <=
              Validations.getSumVersion(APP_VERSION)
            ) {
              file.delete();
              REPLACERS.Logger.log(`Pruned stale update APK: ${file.name}`);
            }
          }
        }
      }
    } catch (e) {
      REPLACERS.Logger.warn("Error pruning update cache:", e);
    }
  };

  /**
   * Presents the post-download prompt offering to install via app or view file.
   */
  public showPostDownloadModal = async (
    filePath: string,
    _version: string,
  ): Promise<void> => {
    const { tTyped } = await import("@utils");

    modalRef.openModal?.(
      tTyped("updates.downloadComplete"),
      <Text style={styles.modalBodyText}>
        {tTyped("updates.downloadCompleteMessage")}
      </Text>,
      <View style={styles.modalButtonsRow}>
        <Button
          label={tTyped("labels.cancel")}
          handlePress={() => modalRef.closeModal?.()}
        />
        <Button
          label={tTyped("updates.viewFile")}
          handlePress={() => {
            modalRef.closeModal?.();
            this.viewUpdateFile(filePath);
          }}
        />
        <Button
          label={tTyped("updates.installViaApp")}
          handlePress={() => {
            modalRef.closeModal?.();
            this.installViaApp(filePath);
          }}
        />
      </View>,
    );
  };

  /**
   * Checks package install permissions, requests them if missing with app resume auto-launch,
   * and launches the native package installer.
   */
  public installViaApp = async (filePath: string): Promise<void> => {
    if (!REPLACERS.isNative) return;
    const { NativeFunctionsModule } = await import("@modules");
    const { alerts, deviceInfo } = await import("@utils");

    const canInstall =
      await NativeFunctionsModule.checkPackageInstallPermission();
    if (!canInstall) {
      await alerts.showAlert(
        "updates.permissionRequiredTitle",
        "updates.permissionRequiredMessage",
        async (_, accepted) => {
          if (!accepted) return;

          this.#resumeListener?.remove();
          this.#resumeListener = deviceInfo.addEventListener(
            EventsDeviceInfo.appStateChange,
            async (state) => {
              if (state === "active") {
                this.#resumeListener?.remove();
                this.#resumeListener = null;

                const hasPermission =
                  await NativeFunctionsModule.checkPackageInstallPermission();
                if (hasPermission) {
                  await NativeFunctionsModule.installPackage(filePath);
                }
              }
            },
          );

          await NativeFunctionsModule.requestPackageInstallPermission();
        },
        {
          acceptButtonText: "updates.grantPermission",
          cancelButtonText: "labels.cancel",
          showCancelButton: true,
        },
      );
    } else {
      await NativeFunctionsModule.installPackage(filePath);
    }
  };

  /**
   * Relocates the downloaded update file from cache to public Downloads and opens it.
   */
  public viewUpdateFile = async (filePath: string): Promise<void> => {
    if (!REPLACERS.isNative) return;
    const { NativeFunctionsModule } = await import("@modules");
    const { tTyped } = await import("@utils");

    try {
      const targetPath =
        await NativeFunctionsModule.viewDownloadedFile(filePath);
      modalRef.openSnackBar?.(
        tTyped("updates.fileMovedToDownloads", { path: targetPath }),
      );
    } catch (error) {
      REPLACERS.Logger.error("Error viewing downloaded update file:", error);
    }
  };

  /**
   * Downloads the update package with progress percentage reporting and background notification support.
   */
  public downloadUpdatePackage = async (
    downloadUrl: string,
    version: string,
  ): Promise<void> => {
    if (!REPLACERS.isNative || this.#isDownloading) return;
    this.#isDownloading = true;

    const { alerts, deviceInfo, notificationsManager, tTyped } =
      await import("@utils");

    try {
      const updatesDir = new Directory(Paths.cache, "updates");
      if (!updatesDir.exists) {
        updatesDir.create();
      }

      const apkFile = new File(Paths.cache, "updates", `${version}.apk`);
      if (apkFile.exists && apkFile.size > 0) {
        this.#isDownloading = false;
        await this.showPostDownloadModal(apkFile.uri, version);
        return;
      }

      if (apkFile.exists) {
        try {
          apkFile.delete();
        } catch {
          // ignore
        }
      }

      let isBackground = false;
      let progressListeners: ((pct: number) => void)[] = [];

      modalRef.openModal?.(
        tTyped("updates.downloadingUpdate"),
        <UpdateProgressContent
          subscribe={(cb) => {
            progressListeners.push(cb);
            return () => {
              progressListeners = progressListeners.filter((l) => l !== cb);
            };
          }}
        />,
        <Button
          label={tTyped("updates.alertWhenDone")}
          handlePress={() => {
            isBackground = true;
            modalRef.closeModal?.();
          }}
        />,
      );

      const task = File.createDownloadTask(downloadUrl, apkFile, {
        onProgress: ({ bytesWritten, totalBytes }) => {
          if (totalBytes > 0) {
            const pct = Math.min(
              100,
              Math.max(0, Math.floor((bytesWritten / totalBytes) * 100)),
            );
            progressListeners.forEach((l) => l(pct));
          }
        },
      });

      this.#activeDownloadTask = task;
      const downloadedFile = await task.downloadAsync();
      this.#activeDownloadTask = null;
      this.#isDownloading = false;

      if (
        !downloadedFile ||
        !downloadedFile.exists ||
        downloadedFile.size <= 0
      ) {
        throw new Error("Downloaded package file is empty or missing");
      }

      if (isBackground || deviceInfo.isBackground) {
        this.#pendingDownloadedApk = {
          filePath: downloadedFile.uri,
          version,
        };

        notificationsManager.sendNotification({
          type: "info",
          title: tTyped("updates.downloadComplete"),
          message: tTyped("updates.downloadCompleteMessage"),
          channelId: "updateAvailable",
          reasonNotification: "updateAvailable",
          overrideNotification: false,
          actions: [
            {
              title: tTyped("updates.installViaApp"),
              actionId: "info",
            },
          ],
        });
      } else {
        modalRef.closeModal?.();
        await this.showPostDownloadModal(downloadedFile.uri, version);
      }
    } catch (error) {
      this.#activeDownloadTask = null;
      this.#isDownloading = false;

      REPLACERS.Logger.error("Error downloading native update:", error);

      const apkFile = new File(Paths.cache, "updates", `${version}.apk`);
      if (apkFile.exists) {
        try {
          apkFile.delete();
        } catch {
          // ignore
        }
      }

      modalRef.closeModal?.();

      await alerts.showAlert(
        "updates.downloadFailedTitle",
        "updates.downloadFailedMessage",
        async (_, retry) => {
          if (retry) {
            await this.downloadUpdatePackage(downloadUrl, version);
          }
        },
        {
          acceptButtonText: "updates.retry",
          cancelButtonText: "labels.cancel",
          showCancelButton: true,
        },
      );
    }
  };

  #checkUpdatesNatively: CheckUpdatesNatively = {
    time: 8 * 60 * 60 * 1000,
    func: async () => {
      if (this.#isCheckingUpdates) return false;
      this.#isCheckingUpdates = true;

      try {
        const {
          tTyped,
          openURL,
          deviceInfo,
          ServerFetch,
          notificationsManager,
        } = await import("@utils");

        const res = await ServerFetch.get(
          "/updates/is-update-available/:version/:buildType",
          {
            params: {
              version: APP_VERSION,
              buildType: "android",
            },
          },
        );
        const result = res.data;

        if (
          "error" in result ||
          !result.isUpdateAvailable ||
          !result.downloadUrl
        ) {
          this.#isCheckingUpdates = false;
          return false;
        }

        const downloadUrl = result.downloadUrl;

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
          this.#isCheckingUpdates = false;
          return false;
        }

        const targetVersion = result.latestVersion || "";

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
          modalRef.openModal?.(
            tTyped("updates.updateAvailable"),
            <Text style={styles.modalBodyText}>
              {tTyped("updates.updateAvailableMessage")}
            </Text>,
            <View style={styles.modalButtonsRow}>
              <Button
                label={tTyped("labels.cancel")}
                handlePress={() => modalRef.closeModal?.()}
              />
              <Button
                label={tTyped("updates.visitWebPage")}
                handlePress={() => {
                  modalRef.closeModal?.();
                  openURL(downloadUrl);
                }}
              />
              <Button
                label={tTyped("updates.downloadUpdate")}
                handlePress={() => {
                  modalRef.closeModal?.();
                  this.downloadUpdatePackage(downloadUrl, targetVersion);
                }}
              />
            </View>,
          );
        }

        this.#isCheckingUpdates = false;
        return true;
      } catch (error) {
        this.#isCheckingUpdates = false;
        REPLACERS.Logger.error("Error while updating the app", error);
      }

      this.#isCheckingUpdates = false;
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

  private _initNotificationListener = async () => {
    if (!REPLACERS.isNative) return;
    const { deviceInfo } = await import("@utils");

    deviceInfo.addEventListener(
      EventsDeviceInfo.appStateChange,
      async (state) => {
        if (state === "active" && this.#pendingDownloadedApk) {
          const { filePath, version } = this.#pendingDownloadedApk;
          this.#pendingDownloadedApk = null;
          await this.showPostDownloadModal(filePath, version);
        }
      },
    );
  };

  override async _init(): Promise<void> {
    await this.pruneStaleUpdateCache();
    await Promise.all([
      this._initCheckUpdatesExpo(),
      this._initCheckUpdatesNatively(),
      this._initNotificationListener(),
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
    this.#resumeListener?.remove();
    this.#resumeListener = null;

    if (this.#activeDownloadTask) {
      try {
        this.#activeDownloadTask.cancel();
      } catch {
        // ignore
      }
      this.#activeDownloadTask = null;
    }

    super.destroy();
  }

  constructor() {
    super();
    this._reInit();
  }
}

export const updates: Updates | null = REPLACERS.isWeb ? null : new Updates();
