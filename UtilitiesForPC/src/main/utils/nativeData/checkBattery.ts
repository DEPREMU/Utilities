import dataApp from "../variables";
import { writeLog } from "../logger";
import { execSync } from "child_process";
import { ExpectedNativeWebData } from "@types";

export const checkBattery = (): ExpectedNativeWebData["hasBattery"] => {
  try {
    if (dataApp.getValue("isWindows")) {
      const output = execSync(
        'powershell -Command "Get-WmiObject -Class Win32_Battery"',
        { encoding: "utf8" }
      );

      return output.trim() !== "" ? true : false;
    } else {
      const output = execSync("upower -e", { encoding: "utf8" });

      return output.includes("battery") ? true : false;
    }
  } catch (error) {
    writeLog("Error verifying battery:" + error, "error");
    return "unknown";
  }
};
