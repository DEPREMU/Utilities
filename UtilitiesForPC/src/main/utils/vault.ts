import dataApp from "./vars/variables";
import { exec } from "child_process";
import type Edge from "electron-edge-js";
import { Logger } from "./logger";

const logger = new Logger("Vault");

const edge: typeof Edge | null = dataApp.getValue("isWindows")
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("electron-edge-js")
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
    }`,
      );

      return await new Promise<boolean>((res) => {
        if (!authenticateWithWindowsHello) return res(true);

        const callback = (error: Error, result: AuthWindows) => {
          if (error) {
            logger.error("Error:", error);
            res(false);
          } else {
            logger.log("Windows Hello Authentication Result:", result);
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
        logger.log("Executing pkexec command.");
        exec('pkexec echo "ok"', (err) => {
          resolve(!err);
        });
      });
      return res;
    }
  } catch (e) {
    logger.error("Authentication error:", e);
    return false;
  }
};
