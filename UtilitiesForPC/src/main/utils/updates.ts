import {
  BuildTypeUpdates,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
} from "@types";
import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { app } from "electron";
import dataApp from "./variables";
import { writeLog } from "./logger";
import { getJSPath } from "@utils";
import { handleShutdown } from "./server";
import type { UpdatesRoutes } from "@types";
import { execFileSync, execSync, spawn } from "child_process";

if (!app.isPackaged)
  dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

const urlUpdates = process.env.API_URL.replace("api", "updates"); // API_URL replaced in build process

if (!urlUpdates) {
  throw new Error("API_URL is not defined.");
}

const getURLUpdates = (route: UpdatesRoutes): string => {
  return `${urlUpdates}${route}`;
};

export const deleteDownloadedUpdate = () => {
  if (!dataApp) return;
  if (dataApp.getValue("isUpdating")) return;

  const downloadFilePath = dataApp.getValue("downloadFilePath");
  if (!fs.existsSync(downloadFilePath)) return;

  try {
    fs.unlinkSync(downloadFilePath);
    writeLog("Deleted downloaded update file.", "info");
  } catch {
    try {
      if (dataApp.getValue("isWindows"))
        execSync(
          `powershell -NoProfile -Command "Remove-Item -LiteralPath '${downloadFilePath.replace(
            /'/g,
            "''",
          )}' -Force"`,
          { stdio: "ignore" },
        );
      else execSync(`rm -f "${downloadFilePath.replace(/"/g, '\\"')}"`);
    } catch (error) {
      writeLog(
        "Error deleting downloaded update file: " + String(error),
        "error",
      );
    }
  }
};

const openInstallerOrInstall = async (filePath: string) => {
  writeLog(`Opening installer at path: ${filePath}`, "info");
  if (dataApp.getValue("isWindows")) {
    await new Promise<void>((resolve) =>
      setTimeout(async () => {
        try {
          const child = spawn(filePath, [], {
            detached: true,
            stdio: "ignore",
          });

          child.unref();
          writeLog("Installer spawned on Windows.", "info");
          await handleShutdown();
        } catch (e) {
          writeLog(
            "Error spawning installer on Windows: " + String(e),
            "error",
          );
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

      writeLog(`Executing Linux install command: ${cmd}`, "info");
      const child = spawn(cmd, [], {
        shell: true,
        stdio: "ignore",
        detached: true,
      });
      child.unref();
      await handleShutdown();
    } catch (e) {
      writeLog("Error installing on Linux: " + String(e), "error");
    }
  }
};

export const downloadNewUpdate = async (
  downloadUrl: string,
  downloadFilePath: string,
) => {
  const response = await axios.get(downloadUrl, {
    responseType: "stream",
  });

  return new Promise<"success" | "error">((resolve) => {
    const writer = fs.createWriteStream(downloadFilePath);

    let handleFinishCalled = false;
    const handleFinish = (err?: string) => {
      if (handleFinishCalled) return;
      handleFinishCalled = true;
      writer.close();

      resolve(err ? "error" : "success");
    };
    try {
      writeLog(
        `Starting download from ${downloadUrl} to ${downloadFilePath}`,
        "info",
      );

      response.data.pipe(writer);

      writer.on("finish", async () => {
        writeLog("Download finished successfully.", "info");
        handleFinish();
      });

      writer.on("error", (err: unknown) => {
        writeLog("Error writing update file: " + String(err), "error");
        handleFinish(err instanceof Error ? err.message : String(err));
      });

      response.data.on("error", (err: unknown) => {
        writeLog("Error downloading the file stream: " + String(err), "error");
        handleFinish(err instanceof Error ? err.message : String(err));
      });
    } catch (error) {
      writeLog(
        "Error downloading the update: " +
          (error instanceof Error ? error.message : String(error)),
        "error",
      );
      handleFinish(error instanceof Error ? error.message : String(error));
    }
  });
};

export const updateWebJS = async (downloadUrl: string): Promise<void> => {
  try {
    const filePath = path.join(
      dataApp.getValue("downloadsPath"),
      "utilities-for-pc-web.zip",
    );

    const res = await downloadNewUpdate(downloadUrl, filePath);
    if (res === "error") {
      writeLog("Failed to download the web update.", "error");
      return;
    }

    const unzipper = await import("unzipper");

    const jsDir = getJSPath();

    await Promise.all(
      fs.readdirSync(jsDir).map(async (file) => {
        try {
          if (file.endsWith(".js"))
            await fs.promises.unlink(path.join(jsDir, file));
        } catch {
          writeLog(`Failed to delete old JS file: ${file}`, "warn");
        }
      }),
    );

    await new Promise<void>((resolve) => {
      fs.createWriteStream(filePath)
        .pipe(
          unzipper.Extract({
            path: jsDir,
          }),
        )
        .on("close", async () => {
          writeLog("Web update extracted successfully.", "info");
          try {
            await fs.promises.unlink(filePath);
          } catch {
            writeLog("Failed to delete the web update zip file.", "warn");
          }
          resolve();
        });
    });

    writeLog("Web HTML updated correctly.", "info");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    writeLog("Error updating Web HTML: " + errorMessage, "error");
  }
};

export const verifyNewUpdate = async (buildType: BuildTypeUpdates) => {
  const currentVersion = dataApp.getValue(
    buildType === "electron" ? "currentElectronVersion" : "currentWebVersion",
  );

  try {
    const body: RequestIsUpdateAvailable = {
      buildType,
      currentVersion,
      platformOS: dataApp.getValue("isWindows") ? "windows" : "linux",
    };

    for (let attempts = 0; attempts < 5; attempts++) {
      try {
        const res = await axios.get("https://www.google.com/generate_204", {
          timeout: 2500,
        });
        if (res.status >= 200 && res.status < 300) break;
      } catch {
        writeLog(
          `No internet connection detected. Retry attempt ${attempts + 1}/5`,
          "warn",
        );
        if (attempts === 4) {
          writeLog(
            "No internet connection detected after 5 attempts.",
            "error",
          );
          throw new Error("No internet connection.");
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    const res = await fetch(getURLUpdates("/is-update-available"), {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as ResponseIsUpdateAvailable;
    if (!data?.updateAvailable) return;
    dataApp.setValue("isUpdating", true);

    if (buildType === "electron") {
      const path = dataApp.getValue("downloadFilePath");
      const res = await downloadNewUpdate(data.downloadUrl, path);
      if (res === "error") {
        writeLog("Failed to download the update installer.", "error");
        dataApp.setValue("isUpdating", false);
        return;
      }

      await openInstallerOrInstall(path);
    } else await updateWebJS(data.downloadUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error verifying new update:", errorMessage);
    writeLog("Error verifying new update: " + errorMessage, "error");
  }
};
