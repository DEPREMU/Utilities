import path from "path";
import { File } from "@common";
import { app, dialog } from "electron";

type ValidPaths = {
  [K in keyof typeof StaticPaths]: (typeof StaticPaths)[K] extends string
    ? K
    : never;
}[keyof typeof StaticPaths];

const getMainPath = async () => {
  let mainPath = process.cwd();
  try {
    mainPath = __dirname;
  } catch {
    // Ignore
  }
  if (!app.isPackaged) {
    let exists = false;
    let attempts = 5;
    while (attempts-- > 0) {
      exists = await new File(path.join(mainPath, "package.json")).exists();
      if (exists) break;

      mainPath = path.dirname(mainPath);
    }
    if (!exists) throw new Error("Could not find main path");
  }

  return mainPath;
};
const mainPath = await getMainPath();

class StaticPaths {
  static readonly MAIN_PATH = app.isPackaged
    ? path.resolve(process.resourcesPath)
    : mainPath;

  static readonly BUILD = app.isPackaged
    ? path.join(StaticPaths.MAIN_PATH, "app.asar", "out")
    : path.join(StaticPaths.MAIN_PATH, "out");

  static readonly DIST = path.join(StaticPaths.MAIN_PATH, "dist");

  static readonly ASSETS = path.join(StaticPaths.MAIN_PATH, "assets");

  static readonly LOGS = path.join(
    StaticPaths.MAIN_PATH,
    "..",
    "log-utilities-for-pc.txt",
  );

  static readonly TEMP = app.isPackaged
    ? path.join(app.getPath("temp"), "UtilitiesForPC")
    : path.join(StaticPaths.MAIN_PATH, "temp", "UtilitiesForPC");

  static readonly DOWNLOADS = path.resolve(app.getPath("downloads"));
}

export class Paths extends StaticPaths {
  static readonly getPath = (
    key: ValidPaths,
    ...segments: string[]
  ): string => {
    return path.join(Paths[key], ...segments);
  };

  static readonly askPath = async (): Promise<string | null> => {
    try {
      const { default: dataApp } = await import("./variables");

      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow) return null;

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory", "dontAddToRecent"],
      });
      if (result.canceled) return null;
      if (!result.filePaths.length) return null;

      return result.filePaths[0];
    } catch (error) {
      import("@utils").then(({ Logger }) => {
        new Logger("Vars-Paths").log("Error asking path: ", error);
      });
      return null;
    }
  };
}
