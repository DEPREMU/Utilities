import dataApp from "../variables";
import { exec } from "child_process";
import { Logger } from "../logger";
import { ExpectedNativeWebData } from "@types";

export const checkBattery = async (): Promise<
  ExpectedNativeWebData["hasBattery"]
> => {
  try {
    if (dataApp.getValue("isWindows")) {
      const output = await new Promise<string>((r) =>
        exec(
          'powershell -Command "Get-WmiObject -Class Win32_Battery"',
          (_, stdout) => {
            r(stdout ?? "");
          },
        ),
      );

      return output.trim() !== "";
    } else {
      const output = await new Promise<string>((r) =>
        exec("upower -e", { encoding: "utf8" }, (_, stdout) => {
          r(stdout ?? "");
        }),
      );

      return output.includes("battery");
    }
  } catch (error) {
    Logger.error("Error verifying battery:", error);
    return "unknown";
  }
};
