import chalk from "chalk";
import type { ColorName, BackgroundColorName } from "chalk";

type Languages = "en" | "es";

const languages: Languages[] = ["en", "es"];

const langCode = process.env.LANG || "en_US";
let lang = langCode.split(".")[0].split("_")[0]?.toLowerCase() as Languages;
if (!languages.includes(lang)) lang = "en";

export type TranslationsKeys =
  | "appOpened"
  | "restartNow"
  | "openAppNow"
  | "buildingApp"
  | "buildFailed"
  | "assetsCopied"
  | "wineRequired"
  | "copyingAssets"
  | "buildingWebApp"
  | "installingWine"
  | "wineNotWorking"
  | "wineDescription"
  | "autoStartEnabled"
  | "pressEnterToExit"
  | "wineNotInstalled"
  | "jsAndFontsInlined"
  | "enablingAutoStart"
  | "installWinePrompt"
  | "restartingComputer"
  | "wineInstallCommand"
  | "windowsBuildFailed"
  | "failedToBuildWebApp"
  | "appPathDoesNotExist"
  | "installWineManually"
  | "failedToInstallWine"
  | "bothBuildsCompleted"
  | "elevatingPermissions"
  | "failedToFindJSBundle"
  | "failedToFindJSBundle"
  | "skipWineInstallation"
  | "buildingLinuxPackage"
  | "pleaseRestartComputer"
  | "dependenciesInstalled"
  | "buildingBothPlatforms"
  | "windowsBuildCompleted"
  | "installingDependencies"
  | "wineRequiredForWindows"
  | "installWSLInstructions"
  | "appBuildCommandExecuted"
  | "appPackagedSuccessfully"
  | "FailedToFindSnapPackage"
  | "webAppBuiltSuccessfully"
  | "failedToFindDesktopFile"
  | "failedToEnableAutoStart"
  | "enableAutoStartQuestion"
  | "buildingWindowsAndLinux"
  | "installDebPackagePrompt"
  | "failedToFindMainJSBundle"
  | "appPackagedSuccessMessage"
  | "wineInstalledSuccessfully"
  | "buildingWindowsExecutable"
  | "someDependenciesInstalled"
  | "oldBuildDirectoriesCleaned"
  | "inliningJSAndFontsIntoHTML"
  | "installingLinuxDependencies"
  | "preparingFilesForElectronApp"
  | "considerUsingWindowsPlatform"
  | "cleaningUpOldBuildDirectories"
  | "buildingLinuxPackageFromWindows"
  | "linuxBuildFromWindowsRequiresWSL"
  | "failedToFindAFolderRequiredForBuild"
  | "buildingWindowsFromLinuxRequiresWine";

export type Translations = Record<
  Languages,
  Record<
    TranslationsKeys,
    { color: ColorName; message: string; bgColor?: BackgroundColorName }
  >
>;

export const translations: Translations = {
  en: {
    pressEnterToExit: {
      color: "yellow",
      message: "\nPress Enter to exit...",
    },
    buildingApp: { color: "yellow", message: "Building Electron app..." },
    failedToFindAFolderRequiredForBuild: {
      color: "red",
      message: "Failed to find a folder required for the build: ",
    },
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
    autoStartEnabled: {
      color: "green",
      message: "Auto-start enabled for the app.",
    },
    wineRequired: {
      color: "yellow",
      message: "\nWine is required to build Windows executables from Linux",
    },
    wineDescription: {
      color: "blue",
      message:
        "Wine allows Electron Builder to package Windows apps on Linux\n",
    },
    installWinePrompt: {
      color: "yellow",
      message:
        "Do you want to install Wine now? This will run:\n  sudo dpkg --add-architecture i386\n  sudo apt update\n  sudo apt install wine64 wine32\n(y/n): ",
    },
    skipWineInstallation: {
      color: "red",
      message: "\n❌ Skipping Wine installation",
    },
    installWineManually: {
      color: "yellow",
      message:
        "To install manually, run:\n  sudo dpkg --add-architecture i386 && sudo apt update && sudo apt install wine64 wine32\n",
    },
    wineNotInstalled: {
      color: "red",
      message: "Wine is required but not installed",
    },
    installingWine: {
      color: "blue",
      message: "\nInstalling Wine...",
    },
    wineInstalledSuccessfully: {
      color: "green",
      message: "Wine installed successfully\n",
    },
    failedToInstallWine: {
      color: "red",
      message: "Failed to install Wine. Please install manually and try again.",
    },
    buildingBothPlatforms: {
      color: "yellow",
      message: "Building for both Linux and Windows...\n",
    },
    buildingWindowsAndLinux: {
      color: "blue",
      message: "Building Windows and Linux packages...",
    },
    bothBuildsCompleted: {
      color: "green",
      message: "\nBoth Windows and Linux builds completed!",
    },
    buildFailed: {
      color: "red",
      message: "\nBuild failed. Common issues:",
    },
    wineNotWorking: {
      color: "red",
      message: "  - Wine not installed or not working properly",
    },
    wineInstallCommand: {
      color: "yellow",
      message: "  - Run: sudo apt install wine64 wine32",
    },
    buildingWindowsExecutable: {
      color: "yellow",
      message: "Building Windows executable...\n",
    },
    buildingWindowsFromLinuxRequiresWine: {
      color: "yellow",
      message: "Building Windows executable from Linux requires Wine",
    },
    windowsBuildCompleted: {
      color: "green",
      message: "\nWindows build completed!",
    },
    windowsBuildFailed: {
      color: "red",
      message: "\nWindows build failed.",
    },
    wineRequiredForWindows: {
      color: "red",
      message:
        "Wine is required to build Windows executables on Linux.\nInstall: sudo apt install wine64 wine32",
    },
    buildingLinuxPackageFromWindows: {
      color: "yellow",
      message:
        "Building Linux packages from Windows requires WSL with dpkg-dev\nConsider using --platform=windows instead\n",
    },
    considerUsingWindowsPlatform: {
      color: "yellow",
      message: "Consider using --platform=windows instead\n",
    },
    buildingLinuxPackage: {
      color: "yellow",
      message: "Building Linux package...\n",
    },
    installingLinuxDependencies: {
      color: "blue",
      message: "Installing Linux build dependencies...",
    },
    someDependenciesInstalled: {
      color: "yellow",
      message: "Some dependencies might already be installed",
    },
    linuxBuildFromWindowsRequiresWSL: {
      color: "red",
      message: "\nLinux build from Windows requires WSL",
    },
    installWSLInstructions: {
      color: "yellow",
      message:
        "Install WSL and build tools:\n  wsl --install\n  sudo apt install dpkg-dev fakeroot",
    },
    installDebPackagePrompt: {
      color: "yellow",
      message: "\nDo you want to install the .deb package? (y/n): ",
    },
  },
  es: {
    pressEnterToExit: {
      color: "yellow",
      message: "\nPresione Enter para salir...",
    },
    failedToFindAFolderRequiredForBuild: {
      color: "red",
      message:
        "No se pudo encontrar una carpeta requerida para la construcción: ",
    },
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
    autoStartEnabled: {
      color: "green",
      message: "Inicio automático habilitado para la aplicación.",
    },
    wineRequired: {
      color: "yellow",
      message:
        "\nSe requiere Wine para construir ejecutables de Windows desde Linux",
    },
    wineDescription: {
      color: "blue",
      message:
        "Wine permite a Electron Builder empaquetar aplicaciones de Windows en Linux\n",
    },
    installWinePrompt: {
      color: "yellow",
      message:
        "¿Desea instalar Wine ahora? Esto ejecutará:\n  sudo dpkg --add-architecture i386\n  sudo apt update\n  sudo apt install wine64 wine32\n(s/n): ",
    },
    skipWineInstallation: {
      color: "red",
      message: "\n❌ Omitiendo instalación de Wine",
    },
    installWineManually: {
      color: "yellow",
      message:
        "Para instalar manualmente, ejecute:\n  sudo dpkg --add-architecture i386 && sudo apt update && sudo apt install wine64 wine32\n",
    },
    wineNotInstalled: {
      color: "red",
      message: "Wine es requerido pero no está instalado",
    },
    installingWine: {
      color: "blue",
      message: "\nInstalando Wine...",
    },
    wineInstalledSuccessfully: {
      color: "green",
      message: "Wine instalado exitosamente\n",
    },
    failedToInstallWine: {
      color: "red",
      message:
        "Falló la instalación de Wine. Por favor instale manualmente e intente de nuevo.",
    },
    buildingBothPlatforms: {
      color: "yellow",
      message: "Construyendo para Linux y Windows...\n",
    },
    buildingWindowsAndLinux: {
      color: "blue",
      message: "Construyendo paquetes de Windows y Linux...",
    },
    bothBuildsCompleted: {
      color: "green",
      message: "\n¡Construcciones de Windows y Linux completadas!",
    },
    buildFailed: {
      color: "red",
      message: "\nLa construcción falló. Problemas comunes:",
    },
    wineNotWorking: {
      color: "red",
      message: "  - Wine no está instalado o no funciona correctamente",
    },
    wineInstallCommand: {
      color: "yellow",
      message: "  - Ejecute: sudo apt install wine64 wine32",
    },
    buildingWindowsExecutable: {
      color: "yellow",
      message: "Construyendo ejecutable de Windows...\n",
    },
    buildingWindowsFromLinuxRequiresWine: {
      color: "yellow",
      message: "Construir ejecutable de Windows desde Linux requiere Wine",
    },
    windowsBuildCompleted: {
      color: "green",
      message: "\n¡Construcción de Windows completada!",
    },
    windowsBuildFailed: {
      color: "red",
      message: "\nLa construcción de Windows falló.",
    },
    wineRequiredForWindows: {
      color: "red",
      message:
        "Wine es requerido para construir ejecutables de Windows en Linux.\nInstale: sudo apt install wine64 wine32",
    },
    buildingLinuxPackageFromWindows: {
      color: "yellow",
      message:
        "Construir paquetes de Linux desde Windows requiere WSL con dpkg-dev\nConsidere usar --platform=windows en su lugar\n",
    },
    considerUsingWindowsPlatform: {
      color: "yellow",
      message: "Considere usar --platform=windows en su lugar\n",
    },
    buildingLinuxPackage: {
      color: "yellow",
      message: "Construyendo paquete de Linux...\n",
    },
    installingLinuxDependencies: {
      color: "blue",
      message: "Instalando dependencias de construcción para Linux...",
    },
    someDependenciesInstalled: {
      color: "yellow",
      message: "Algunas dependencias pueden ya estar instaladas",
    },
    linuxBuildFromWindowsRequiresWSL: {
      color: "red",
      message: "\nLa construcción de Linux desde Windows requiere WSL",
    },
    installWSLInstructions: {
      color: "yellow",
      message:
        "Instale WSL y herramientas de construcción:\n  wsl --install\n  sudo apt install dpkg-dev fakeroot",
    },
    installDebPackagePrompt: {
      color: "yellow",
      message: "\n¿Desea instalar el paquete .deb? (s/n): ",
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
