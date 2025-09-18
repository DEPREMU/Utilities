const chalk = require("chalk");
const electron = require("electron");

const isDev = process.env.NODE_ENV === "development";

if (!electron.clipboard)
  isDev && console.error(chalk.red("clipboard API is not available"));
else isDev && console.log(chalk.green("clipboard API loaded successfully"));

electron.contextBridge.exposeInMainWorld("myElectronApp", {
  readClipboard: () => {
    try {
      return electron.clipboard.readText();
    } catch {
      return "";
    }
  },
  setClipboard: (text: string) => {
    try {
      electron.clipboard.writeText(text);
    } catch {
      // ignore
    }
  },
});
