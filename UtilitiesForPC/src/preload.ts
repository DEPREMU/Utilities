const { clipboard, contextBridge, ipcRenderer } = require("electron");

let idleTimeout: NodeJS.Timeout | null = null;

contextBridge.exposeInMainWorld("UtilitiesForPC", {
  readClipboard: () => {
    try {
      return clipboard.readText();
    } catch {
      return "";
    }
  },
  setClipboard: (text: string) => {
    try {
      clipboard.writeText(text);
    } catch {
      // ignore
    }
  },
  notifyLoginStatus: (isLoggedIn: boolean) => {
    if (idleTimeout) clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      idleTimeout = null;
      ipcRenderer.send("user-login-status", isLoggedIn);
    }, 500);
  },
});
