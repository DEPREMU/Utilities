import path from "path";
import axios from "axios";
import FormData from "form-data";
import { Script } from "../common";
import type * as Types from "@types";
import { ServerError } from "@commonSrc/both/errors/Error";
import { Directory, File, Logger } from "@commonSrc/serverOrElectron";
import { ServerFetch, Validations } from "@commonSrc/both";

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
        version: script.appConfig.version || "",
        buildType: "android",
      },
    },
  );

  const result = res.data;

  if ("error" in result) throw new Error(ServerError.getMessage(result));

  const isGreater =
    !result.latestVersion ||
    Validations.isNewVersion(
      result.latestVersion,
      script.appConfig.version || "",
    );

  if (!isGreater) {
    Logger.log("Version already exists on the server or is not newer.");
    script.stop("Version already exists on the server or is not newer.");
  } else Logger.log("New version detected. Proceeding with build and upload.");
});

script.addValue(
  "appBuildDir",
  new script.Directory(path.join(script.PATHS.app, "builds")),
);

script.addStep("Verify APK exists", async () => {
  const dir = script.getValue("appBuildDir") as Directory;

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

script.addStep(`Upload APK ${script.appConfig.version}`, async () => {
  const apkFile = script.getValue("apkFile") as File;

  const data: Types.RequestUploadUpdate = {
    version: script.appConfig.version || "",
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

  const url = ServerFetch.getRoute("POST", "/updates/upload");
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
