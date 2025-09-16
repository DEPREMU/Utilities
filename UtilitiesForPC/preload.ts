const electron = require("electron");

const isDev = process.env.NODE_ENV === "development";

if (!electron.clipboard)
  isDev && console.error("clipboard API is not available");
else isDev && console.log("clipboard API loaded successfully");

electron.contextBridge.exposeInMainWorld("myElectronApp", {
  readClipboard: () => {
    try {
      return electron.clipboard.readText();
    } catch {
      return "";
    }
  },
});
