import dataApp from "./variables";
import { exec } from "child_process";
import type Edge from "electron-edge-js";

const edge: typeof Edge | null = dataApp.getValue("isWindows")
  ? require("electron-edge-js")
  : null;

type AuthWindows = "Verified" | "NotVerified" | "DeviceBusy";

export const authenticateUser = async (): Promise<boolean> => {
  try {
    if (dataApp.getValue("isWindows")) {
      const authenticateWithWindowsHello = edge?.func<unknown, AuthWindows>(
        "cs",
        `using System;
    using Windows.Security.Credentials.UI;
    public class Startup
    {
        public async Task<object> Invoke(object input)
        {
            var result = await UserConsentVerifier.RequestVerificationAsync();
            return result.ToString();
        }
    }`
      );

      return await new Promise<boolean>((res) => {
        if (!authenticateWithWindowsHello) return res(false);

        const callback = (error: Error, result: AuthWindows) => {
          if (error) {
            console.error("Error:", error);
            res(false);
          } else {
            console.log("Windows Hello Authentication Result:", result);
            if (result === "DeviceBusy")
              authenticateWithWindowsHello(null, callback);
            else if (result === "Verified") res(true);
            else res(false);
          }
        };

        authenticateWithWindowsHello(null, callback);
      });
    } else {
      const res = await new Promise<boolean>((resolve) => {
        exec('pkexec echo "ok"', (err) => {
          resolve(!err);
        });
      });
      return res;
    }
  } catch (error) {
    return false;
  }
};
