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
import { handleShutdown } from "./server";
import type { UpdatesRoutes } from "./../../../../types";
import { execFileSync, execSync, spawn } from "child_process";

if (!app.isPackaged)
  dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

let urlUpdates = process.env.API_URL.replace("api", "updates"); // API_URL replaced in build process

if (!urlUpdates) {
  throw new Error("API_URL is not defined.");
}

const getURLUpdates = (route: UpdatesRoutes): string => {
  return `${urlUpdates}${route}`;
};

export const getHtmlPath = (): string => {
  if (app.isPackaged)
    return path.join(process.resourcesPath, "dist", "index.html");
  else return path.join(path.dirname(__dirname), "dist", "index.html");
};

export const deleteDownloadedUpdate = () => {
  const downloadFilePath = dataApp.getValue("downloadFilePath");
  if (!fs.existsSync(downloadFilePath)) return;

  try {
    fs.unlinkSync(downloadFilePath);
    writeLog("Deleted downloaded update file.", "info");
  } catch (error) {
    writeLog(
      "Error deleting downloaded update file: " + String(error),
      "error"
    );
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
            "error"
          );
        } finally {
          resolve();
        }
      }, 5000)
    );
  } else {
    try {
      const cmd = `sudo dpkg -i "${filePath}" && sudo apt-get install -f -y && ${path.join(
        dataApp.getValue("userHome"),
        ".config",
        "utilities-for-pc-autostart.sh"
      )}`;

      writeLog(`Executing Linux install command: ${cmd}`, "info");
      const child = spawn(cmd, [], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      await handleShutdown();
    } catch (e) {
      writeLog("Error installing on Linux: " + String(e), "error");
    }
  }
};

export const downloadNewUpdate = async (downloadUrl: string) => {
  return new Promise<void>(async (resolve) => {
    try {
      const downloadFilePath = dataApp.getValue("downloadFilePath");
      writeLog(
        `Starting download from ${downloadUrl} to ${downloadFilePath}`,
        "info"
      );

      const response: any = await axios.get(downloadUrl, {
        responseType: "stream",
      });

      const writer = fs.createWriteStream(downloadFilePath);
      response.data.pipe(writer);

      writer.on("finish", async () => {
        writeLog("Download finished successfully.", "info");
        writer.close();
        await openInstallerOrInstall(downloadFilePath);
        resolve();
      });

      writer.on("error", (err: unknown) => {
        console.error("Error writing file", err);
        writeLog("Error writing update file: " + String(err), "error");
        writer.close();
        resolve();
      });

      response.data.on("error", (err: unknown) => {
        console.error("Error downloading the file", err);
        writeLog("Error downloading the file stream: " + String(err), "error");
        writer.close();
        resolve();
      });
    } catch (error) {
      console.error("Error downloading the update:", error);
      writeLog("Error downloading the update: " + String(error), "error");
      resolve();
    }
  });
};

export const updateWebHTML = async (downloadUrl: string): Promise<void> => {
  try {
    const response = await axios.get<string>(downloadUrl, {
      responseType: "text",
    });

    const html = response.data;

    if (!html || typeof html !== "string" || html.length < 1000) {
      writeLog(
        "HTML recibido es demasiado pequeño o inválido. Se omite.",
        "warn"
      );
      return;
    }

    const htmlPath = getHtmlPath();

    if (dataApp.getValue("isWindows")) {
      execSync(
        `powershell -NoProfile -Command "Set-Content -LiteralPath '${htmlPath.replace(
          /'/g,
          "''"
        )}' -Value $input"`,
        {
          input: html,
          stdio: ["pipe", "ignore", "ignore"],
        }
      );
    } else {
      execFileSync("sudo", ["tee", htmlPath], {
        input: html,
        stdio: ["pipe", "ignore", "ignore"],
      });
    }

    writeLog("Web HTML updated correctly.", "info");
  } catch (error) {
    console.error("Error updating Web HTML:", error);
    writeLog("Error updating Web HTML", "error");
  }
};

export const verifyNewUpdate = async (buildType: BuildTypeUpdates) => {
  const currentVersion = dataApp.getValue(
    buildType === "electron" ? "currentElectronVersion" : "currentWebVersion"
  );

  try {
    const body: RequestIsUpdateAvailable = {
      buildType,
      currentVersion,
      platformOS: dataApp.getValue("isWindows") ? "windows" : "linux",
    };
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
    if (buildType === "electron") await downloadNewUpdate(data.downloadUrl);
    else await updateWebHTML(data.downloadUrl);
  } catch (error) {
    console.error("Error verifying new update:", error);
    writeLog("Error verifying new update", "error");
  }
};
