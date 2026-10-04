import {
  File,
  Timers,
  Network,
  REPLACERS,
  Directory,
  ServerFetch,
} from "@common";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { app } from "electron";
import dataApp from "./variables";
import { Enums } from "@types";
import { Logger } from "./logger";
import { pipeline } from "node:stream/promises";
import { ServerError } from "@commonSrc/both/errors/Error";
import type { Readable } from "node:stream";
import { handleShutdown } from "./server";
import { execFile, spawn } from "child_process";
import { nativeData, Paths } from "@utils";

if (!app.isPackaged)
  dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

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
  target: string | File,
): Promise<"success" | "error"> => {
  const file = target instanceof File ? target : new File(target);

  Logger.log(`Starting download from ${downloadUrl} to ${file.path}`);

  let writer: ReturnType<File["createStream"]["write"]> | null = null;

  try {
    const response = await axios.get<Readable>(downloadUrl, {
      responseType: "stream",

      validateStatus: (status) => status >= 200 && status < 300,
    });

    if (!response.data) {
      throw new Error("Download returned an empty response stream");
    }

    writer = file.createStream.write();

    await pipeline(response.data, writer);

    Logger.log("Download finished successfully.");

    return "success";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    Logger.error("Error downloading the update:", message);

    try {
      await file.rm();
    } catch (cleanupError) {
      Logger.error("Error removing incomplete update file:", cleanupError);
    }

    return "error";
  } finally {
    if (writer) {
      try {
        writer.close();
      } catch (error) {
        Logger.error("Error closing download writer:", error);
      }
    }
  }
};

export const updateWeb = async (downloadUrl: string): Promise<void> => {
  const distPath = Paths.DIST;
  if (!distPath.endsWith("dist")) {
    Logger.error(
      "The distribution path is not correctly set. Expected it to end with 'dist'.",
    );
    return;
  }

  const dir = new Directory(distPath);
  const dirBackup = new Directory(distPath + "_backup");

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

    let success = REPLACERS.isDev;
    if (await dir.exists())
      success = (await dir.rename(dirBackup)) instanceof Directory;

    if (!success) {
      Logger.error("Failed to move old web files.");
      return;
    }

    await new Promise<void>((resolve) => {
      file.createStream
        .read()
        .pipe(unzipper.Extract({ path: distPath }))
        .on("close", async () => {
          Logger.log("Web update extracted successfully.");
          await Promise.all([dirBackup.rm(), file.rm()]);
          resolve();
        });
    });

    const files = await dir.readDir();
    if (files.length === 0)
      throw new Error("Web update extracted folder is empty.");

    Logger.log("Web HTML updated correctly.");
  } catch (error) {
    await dirBackup.rename(distPath);

    Logger.error("Error updating Web HTML:", error);
  }
};

export const verifyNewUpdate = async (buildType: Enums["UpdateType"]) => {
  const currentVersion =
    buildType !== "web"
      ? nativeData.getValue("version")
      : dataApp.getValue("currentWebVersion");

  try {
    const hasInternet = await Network.waitForOnline(5, 3000);
    if (!hasInternet) {
      Logger.warn("No internet connection. Skipping update check.");
      return;
    }

    const res = await ServerFetch.get(
      "/updates/is-update-available/:version/:buildType",
      {
        params: {
          version: currentVersion,
          buildType,
        },
      },
    );

    const data = res.data;

    if ("error" in data) {
      Logger.error(
        "Error verifying new update (server error):",
        ServerError.getMessage(data),
      );
      return;
    }

    if (!data?.isUpdateAvailable || !data.downloadUrl) return;
    dataApp.setValue("isUpdating", true);

    if (buildType !== "web") {
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
