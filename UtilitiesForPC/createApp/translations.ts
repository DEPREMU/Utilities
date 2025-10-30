import chalk from "chalk";
import type { ColorName, BackgroundColorName } from "chalk";

type Languages = "en" | "es";

const languages: Languages[] = ["en", "es"];

const langCode = process.env.LANG || "en_US";
let lang = langCode.split(".")[0].split("_")[0]?.toLowerCase() as Languages;
if (!languages.includes(lang)) lang = "en";

export type TranslationsKeys =
  | "buildingApp"
  | "appBuildCommandExecuted"
  | "elevatingPermissions"
  | "appPackagedSuccessfully"
  | "pleaseRestartComputer"
  | "restartNow"
  | "restartingComputer"
  | "openAppNow"
  | "appOpened"
  | "appPackagedSuccessMessage"
  | "FailedToFindSnapPackage"
  | "failedToFindMainJSBundle"
  | "jsAndFontsInlined"
  | "failedToFindJSBundle"
  | "assetsCopied"
  | "copyingAssets"
  | "preparingFilesForElectronApp"
  | "oldBuildDirectoriesCleaned"
  | "cleaningUpOldBuildDirectories"
  | "webAppBuiltSuccessfully"
  | "failedToBuildWebApp"
  | "dependenciesInstalled"
  | "installingDependencies"
  | "appPathDoesNotExist"
  | "buildingWebApp"
  | "inliningJSAndFontsIntoHTML"
  | "failedToFindJSBundle"
  | "failedToFindDesktopFile"
  | "enablingAutoStart"
  | "failedToEnableAutoStart"
  | "enableAutoStartQuestion";

export type Translations = Record<
  Languages,
  Record<
    TranslationsKeys,
    { color: ColorName; message: string; bgColor?: BackgroundColorName }
  >
>;

export const translations: Translations = {
  en: {
    buildingApp: { color: "yellow", message: "Building Electron app..." },
    appBuildCommandExecuted: {
      color: "green",
      message: "Electron app build command executed.",
    },
    elevatingPermissions: {
      color: "blue",
      message: "Elevating permissions and packaging the app...",
    },
    appPackagedSuccessfully: {
      color: "green",
      message: "App packaged successfully. Now it will be installed.",
    },
    pleaseRestartComputer: {
      color: "yellow",
      message:
        "App installed successfully. You need to restart your computer, do you want to restart now? (y/n): ",
    },
    restartNow: {
      color: "blue",
      message: "Restarting the computer...",
    },
    restartingComputer: {
      color: "yellow",
      message:
        "Please restart your computer later to complete the installation.",
    },
    openAppNow: {
      color: "yellow",
      message: "Do you want to open the app now? (y/n): ",
    },
    appOpened: {
      color: "green",
      message: "App opened successfully.",
    },
    appPackagedSuccessMessage: {
      color: "green",
      message:
        "App was packaged successfully. Now you can wait for the PowerShell window to close to install the app in the folder 'dist-electron'.",
    },
    FailedToFindSnapPackage: {
      color: "red",
      message: "Failed to find the snap package in dist-electron.",
    },
    failedToFindMainJSBundle: {
      color: "red",
      message: "Failed to find the main JS bundle in the specified path: ",
    },
    jsAndFontsInlined: {
      color: "green",
      message: "JS and fonts have been inlined into HTML successfully.",
    },
    failedToFindJSBundle: {
      color: "red",
      message: "Failed to find the JS bundle in the specified path: ",
    },
    assetsCopied: {
      color: "green",
      message: "Assets copied successfully.",
    },
    copyingAssets: {
      color: "yellow",
      message: "Copying assets...",
    },
    preparingFilesForElectronApp: {
      color: "yellow",
      message: "Preparing files for Electron app...",
    },
    oldBuildDirectoriesCleaned: {
      color: "green",
      message: "Old build directories cleaned up.",
    },
    cleaningUpOldBuildDirectories: {
      color: "yellow",
      message: "Cleaning up old build directories...",
    },
    webAppBuiltSuccessfully: {
      color: "green",
      message: "Web app built successfully.",
    },
    failedToBuildWebApp: {
      color: "red",
      message: "Failed to build the web app: ",
    },
    dependenciesInstalled: {
      color: "green",
      message: "Dependencies installed successfully.",
    },
    installingDependencies: {
      color: "yellow",
      message: "Installing dependencies...",
    },
    appPathDoesNotExist: {
      color: "red",
      message: "App path does not exist: ",
    },
    buildingWebApp: {
      color: "yellow",
      message: "Building web app...",
    },
    inliningJSAndFontsIntoHTML: {
      color: "yellow",
      message: "Inlining JS and fonts into HTML...",
    },
    enableAutoStartQuestion: {
      color: "yellow",
      message: "Do you want to enable auto-start for the app? (y/n): ",
    },
    enablingAutoStart: {
      color: "yellow",
      message: "Enabling auto-start for the app...",
    },
    failedToEnableAutoStart: {
      color: "red",
      message: "Failed to enable auto-start for the app.",
    },
    failedToFindDesktopFile: {
      color: "red",
      message: "Failed to find the desktop file in the specified path: ",
    },
  },
  es: {
    buildingApp: {
      color: "yellow",
      message: "Construyendo la aplicación Electron...",
    },
    appBuildCommandExecuted: {
      color: "green",
      message: "Comando de construcción de la aplicación Electron ejecutado.",
    },
    elevatingPermissions: {
      color: "blue",
      message: "Elevando permisos y empaquetando la aplicación...",
    },
    appPackagedSuccessfully: {
      color: "green",
      message: "Aplicación empaquetada con éxito. Ahora se instalará.",
    },
    pleaseRestartComputer: {
      color: "yellow",
      message:
        "Aplicación instalada con éxito. Necesita reiniciar su computadora, ¿desea reiniciar ahora? (s/n): ",
    },
    restartNow: {
      color: "blue",
      message: "Reiniciando la computadora...",
    },
    restartingComputer: {
      color: "yellow",
      message:
        "Por favor, reinicie su computadora más tarde para completar la instalación.",
    },
    openAppNow: {
      color: "yellow",
      message: "¿Desea abrir la aplicación ahora? (s/n): ",
    },
    appOpened: {
      color: "green",
      message: "Aplicación abierta con éxito.",
    },
    appPackagedSuccessMessage: {
      color: "green",
      message:
        "La aplicación se empaquetó con éxito. Ahora puede esperar a que la ventana de PowerShell se cierre para instalar la aplicación en la carpeta 'dist-electron'.",
    },
    FailedToFindSnapPackage: {
      color: "red",
      message: "No se pudo encontrar el paquete snap en dist-electron.",
    },
    failedToFindMainJSBundle: {
      color: "red",
      message:
        "No se pudo encontrar el paquete JS principal en la ruta especificada: ",
    },
    jsAndFontsInlined: {
      color: "green",
      message: "JS y fuentes se han integrado en HTML con éxito.",
    },
    failedToFindJSBundle: {
      color: "red",
      message: "No se pudo encontrar el paquete JS en la ruta especificada: ",
    },
    assetsCopied: {
      color: "green",
      message: "Recursos copiados con éxito.",
    },
    copyingAssets: {
      color: "yellow",
      message: "Copiando recursos...",
    },
    preparingFilesForElectronApp: {
      color: "yellow",
      message: "Preparando archivos para la aplicación Electron...",
    },
    oldBuildDirectoriesCleaned: {
      color: "green",
      message: "Directorios de construcción antiguos limpiados.",
    },
    cleaningUpOldBuildDirectories: {
      color: "yellow",
      message: "Limpiando directorios de construcción antiguos...",
    },
    webAppBuiltSuccessfully: {
      color: "green",
      message: "Aplicación web construida con éxito.",
    },
    failedToBuildWebApp: {
      color: "red",
      message: "No se pudo construir la aplicación web: ",
    },
    dependenciesInstalled: {
      color: "green",
      message: "Dependencias instaladas con éxito.",
    },
    installingDependencies: {
      color: "yellow",
      message: "Instalando dependencias...",
    },
    appPathDoesNotExist: {
      color: "red",
      message: "La ruta de la aplicación no existe: ",
    },
    buildingWebApp: {
      color: "yellow",
      message: "Construyendo aplicación web...",
    },
    inliningJSAndFontsIntoHTML: {
      color: "yellow",
      message: "Integrando JS y fuentes en HTML...",
    },
    failedToFindDesktopFile: {
      color: "red",
      message:
        "No se pudo encontrar el archivo de escritorio en la ruta especificada: ",
    },
    enablingAutoStart: {
      color: "yellow",
      message: "Habilitando el inicio automático para la aplicación...",
    },
    failedToEnableAutoStart: {
      color: "red",
      message: "No se pudo habilitar el inicio automático para la aplicación.",
    },
    enableAutoStartQuestion: {
      color: "yellow",
      message:
        "¿Desea habilitar el inicio automático para la aplicación? (s/n): ",
    },
  },
};

export const t = (key: TranslationsKeys): string => {
  const data = translations[lang][key];
  let localChalk = chalk;
  if (data.bgColor) localChalk = localChalk?.[data.bgColor];
  if (data.color) localChalk = localChalk?.[data.color];
  return localChalk?.(data.message) || data.message;
};
