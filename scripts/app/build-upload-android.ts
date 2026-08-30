import path from "path";
import axios from "axios";
import FormData from "form-data";
import { Script } from "../common.ts";
import type * as Types from "@types";
import { ServerFetch } from "@commonSrc/both";
import { APP_PATH, versionExpo } from "../config.ts";
import { Directory, File, Logger } from "@commonSrc/serverOrElectron";

const script = new Script();

script.addStep("Check if server is alive", async () => {
  const isAlive = await ServerFetch.isServerAlive();

  if (!isAlive) throw new Error("Server is not alive.");
});

script.addStep("Check if new version exists", async () => {
  const res = await ServerFetch.get(
    "/updates/is-update-available/:version/:buildType",
    {
      params: {
        version: versionExpo,
        buildType: "android",
      },
    },
  );

  const result = res.data;

  if (!result.isUpdateAvailable) {
    Logger.log("Version already exists on the server.");
    script.stop("Version already exists on the server.");
  } else Logger.log("New version detected. Proceeding with build and upload.");
});

script.addValue(
  "appBuildDir",
  new script.Directory(path.join(APP_PATH, "builds")),
);

script.addStep("Verify APK exists", async () => {
  const dir = script.getValue("appBuild") as Directory;

  if (await dir.exists()) return;

  throw new Error(`Directory not found at ${dir}`);
});

script.addStep("Find APK", async () => {
  const dir = script.getValue("appBuildDir") as Directory;
  const files = await dir.readDir();
  const apkFile = files.find((file) => file.endsWith(".apk"));

  if (!apkFile) throw new Error(`No APK file found in ${dir}`);

  script.addValue("apkFile", new script.File(path.join(dir.path, apkFile)));
});

script.addStep(`Upload APK ${versionExpo}`, async () => {
  const apkFile = script.getValue("apkFile") as File;

  const data: Types.RequestUploadUpdate = {
    version: versionExpo,
    buildType: "android",
  };

  Logger.log(`Uploading Android build...`, data);

  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  formData.append("file", apkFile.createStream.read());

  const contentLength = await new Promise<number>((resolve, reject) => {
    formData.getLength((err, length) => {
      if (err) reject(err);
      else resolve(length);
    });
  });

  const url = ServerFetch.getRoute("GET", "/updates/upload");
  const response = await axios.post(url, formData, {
    headers: {
      ...formData.getHeaders(),
      "Content-Length": contentLength,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 10 * 60 * 1000,
  });

  Logger.log("Upload successful:", response.data);

  if (response.data.error) {
    throw new Error(`Upload failed: ${response.data.error}`);
  }
});

script.run();
