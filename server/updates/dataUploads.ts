import {
  DataUpdates,
  PlatformsOS,
  BuildTypeUpdates,
  RequestUploadUpdate,
} from "@types";
import fs from "fs";
import path from "path";
import { Logger } from "@common";
import { getEnvValue } from "../env.ts";
import { getFinalFileName } from "./uploadUpdate.ts";
import { PATH_DATA_UPDATES, REPLACERS, UPLOAD_DIR } from "../config.ts";

const defaultData: DataUpdates = {
  old: {
    web: {
      linux: {
        version: "unknown",
        timestamp: -1,
      },
      windows: {
        version: "unknown",
        timestamp: -1,
      },
    },
    electron: {
      linux: {
        version: "unknown",
        timestamp: -1,
      },
      windows: {
        version: "unknown",
        timestamp: -1,
      },
    },
    android: {
      timestamp: -1,
      version: "unknown",
    },
  },
  new: {
    web: {
      linux: {
        version: "unknown",
        timestamp: -1,
      },
      windows: {
        version: "unknown",
        timestamp: -1,
      },
    },
    electron: {
      linux: {
        version: "unknown",
        timestamp: -1,
      },
      windows: {
        version: "unknown",
        timestamp: -1,
      },
    },
    android: {
      timestamp: -1,
      version: "unknown",
    },
  },
};

let dataUploads: DataUpdates = defaultData;
try {
  dataUploads = JSON.parse(fs.readFileSync(PATH_DATA_UPDATES, "utf-8"));
} catch {
  // If reading or parsing fails, keep defaultData
}

const deleteOldFile = (data: Omit<RequestUploadUpdate, "timestamp">) => {
  try {
    const oldFilePath = path.join(UPLOAD_DIR, getFinalFileName(data));
    if (!fs.existsSync(oldFilePath)) return;

    fs.rmSync(oldFilePath);
  } catch {
    // ignore
  }
};

export const updateDataUploads = (
  buildType: BuildTypeUpdates,
  platformOS: PlatformsOS,
  version: string,
) => {
  try {
    deleteOldFile({
      buildType,
      platformOS,
      version:
        buildType === "android"
          ? dataUploads.old[buildType].version
          : dataUploads.old[buildType][platformOS].version,
    });
    dataUploads.old = dataUploads.new;
    if (buildType === "android")
      dataUploads.new[buildType] = {
        version,
        timestamp: Date.now(),
      };
    else
      dataUploads.new[buildType][platformOS] = {
        version,
        timestamp: Date.now(),
      };

    if (!REPLACERS.isDev)
      fs.writeFileSync(
        PATH_DATA_UPDATES,
        JSON.stringify(dataUploads, null, 2),
        "utf-8",
      );
  } catch (error) {
    Logger.error("Error updating data uploads:", error);
  }
};

export default dataUploads;
