import path from "path";
import { app, dialog } from "electron";

type ValidPaths = {
  [K in keyof typeof StaticPaths]: (typeof StaticPaths)[K] extends string
    ? K
    : never;
}[keyof typeof StaticPaths];

class StaticPaths {
  static readonly MAIN_PATH = app.isPackaged
    ? path.resolve(process.resourcesPath)
    : path.dirname(process.cwd());

  static readonly BUILD = app.isPackaged
    ? path.join(StaticPaths.MAIN_PATH, "app.asar", "build")
    : path.join(StaticPaths.MAIN_PATH, "build");

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
