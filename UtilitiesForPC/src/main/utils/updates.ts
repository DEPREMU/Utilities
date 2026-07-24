import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { app } from "electron";
import dataApp from "./variables";
import { Logger } from "./logger";
import { handleShutdown } from "./server";
import { execFile, spawn } from "child_process";
import { BuildTypeUpdates } from "@types";
import { nativeData, Paths } from "@utils";
import { File, Timers, Directory, Network, ServerFetch } from "@common";

if (!app.isPackaged)
  dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

const urlUpdates = process.env.API_URL?.replace("api", "updates"); // API_URL replaced in build process

if (!urlUpdates) {
  throw new Error("API_URL is not defined.");
}

export const deleteDownloadedUpdate = async () => {
  if (!dataApp) return;
  if (dataApp.getValue("isUpdating")) return;

  const downloadFilePath = dataApp.getValue("downloadFilePath");
  const file = new File(downloadFilePath);
  if (!(await file.exists())) return;

  try {
    await file.rm();
    Logger.log("Deleted downloaded update file.");
  } catch {
    try {
      if (dataApp.getValue("isWindows"))
        execFile("powershell.exe", [
          "-NoProfile",
          "-Command",
          "Remove-Item -LiteralPath $args[0] -Force",
          "--%",
          downloadFilePath,
        ]);
      else execFile("rm", ["-f", downloadFilePath]);
    } catch (error) {
      Logger.error("Error deleting downloaded update file:", error);
    }
  }
};

const openInstallerOrInstall = async (filePath: string) => {
  Logger.log(`Opening installer at path: ${filePath}`);
  if (dataApp.getValue("isWindows")) {
    await new Promise<void>((resolve) =>
      Timers.setTimeout(async () => {
        try {
          const child = spawn(filePath, [], {
            detached: true,
            stdio: "ignore",
          });

          child.unref();
          Logger.log("Installer spawned on Windows.");
          await handleShutdown();
        } catch (e) {
          Logger.error("Error spawning installer on Windows: ", e);
        } finally {
          resolve();
        }
      }, 5000),
    );
  } else {
    try {
      const cmd = `sudo dpkg -i "${filePath}" && sudo apt-get install -f -y && ${path.join(
        dataApp.getValue("userHome"),
        ".config",
        "utilities-for-pc-autostart.sh",
      )}`;

      Logger.log(`Executing Linux install command: ${cmd}`);
      const child = spawn(cmd, [], {
        shell: true,
        stdio: "ignore",
        detached: true,
      });
      child.unref();
      await handleShutdown();
    } catch (e) {
      Logger.error("Error installing on Linux:", e);
    }
  }
};

export const downloadNewUpdate = async (
  downloadUrl: string,
  _file: string | File,
) => {
  const response = await axios.get(downloadUrl, {
    responseType: "stream",
  });
  const file = _file instanceof File ? _file : new File(_file);

  return new Promise<"success" | "error">((resolve) => {
    const writer = file.createWriteStream();

    let handleFinishCalled = false;
    const handleFinish = (err?: string) => {
      if (handleFinishCalled) return;
      handleFinishCalled = true;
      writer.close();

      resolve(err ? "error" : "success");
    };
    try {
      Logger.log(
        `Starting download from ${downloadUrl} to ${file instanceof File ? file.path : file}`,
      );

      response.data.pipe(writer);

      writer.on("finish", async () => {
        Logger.log("Download finished successfully.");
        handleFinish();
      });

      writer.on("error", (err: unknown) => {
        Logger.error("Error writing update file:", err);
        handleFinish(err instanceof Error ? err.message : String(err));
      });

      response.data.on("error", (err: unknown) => {
        Logger.error("Error downloading the file stream:", err);
        handleFinish(err instanceof Error ? err.message : String(err));
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Logger.error("Error downloading the update:", msg);
      handleFinish(msg);
    }
  });
};

export const updateWeb = async (downloadUrl: string): Promise<void> => {
  try {
    const file = new File(
      path.join(Paths.DOWNLOADS, "utilities-for-pc-web.zip"),
    );

    const status = await downloadNewUpdate(downloadUrl, file);
    if (status === "error") {
      Logger.error("Failed to download the web update.");
      return;
    }

    const unzipper = await import("unzipper");

    const distPath = Paths.DIST;
    if (!distPath.endsWith("dist")) {
      Logger.error(
        "The distribution path is not correctly set. Expected it to end with 'dist'.",
      );
      return;
    }

    const dir = new Directory(distPath);
    let success = false;
    if (await dir.exists())
      success = await dir.rm({ recursive: true, force: true });

    if (!success) {
      Logger.error("Failed to remove old web files.");
      return;
    }

    await new Promise<void>((resolve) => {
      file
        .createWriteStream()
        .pipe(
          unzipper.Extract({
            path: distPath,
          }),
        )
        .on("close", async () => {
          Logger.log("Web update extracted successfully.");
          await file.rm();
          resolve();
        });
    });

    Logger.log("Web HTML updated correctly.");
  } catch (error) {
    Logger.error("Error updating Web HTML:", error);
  }
};

export const verifyNewUpdate = async (buildType: BuildTypeUpdates) => {
  const currentVersion =
    buildType === "electron"
      ? nativeData.getValue("version")
      : dataApp.getValue("currentWebVersion");

  try {
    const hasInternet = await Network.waitForOnline(5, 3000);
    if (!hasInternet) {
      Logger.warn("No internet connection. Skipping update check.");
      return;
    }

    const res = await ServerFetch.get(
      "/updates/is-update-available/:version/:buildType/:platform-optional",
      {
        buildType,
        platform: dataApp.getValue("isWindows") ? "windows" : "linux",
        version: currentVersion,
      },
    );

    const data = res.data;
    if (!data?.isUpdateAvailable || !data.downloadUrl) return;
    dataApp.setValue("isUpdating", true);

    if (buildType === "electron") {
      const path = dataApp.getValue("downloadFilePath");
      const res = await downloadNewUpdate(data.downloadUrl, path);
      if (res === "error") {
        Logger.error("Failed to download the update installer.");
        dataApp.setValue("isUpdating", false);
        return;
      }

      await openInstallerOrInstall(path);
    } else await updateWeb(data.downloadUrl);
  } catch (error) {
    Logger.error("Error verifying new update:", error);
  }
};
