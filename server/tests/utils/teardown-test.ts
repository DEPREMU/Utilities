import fs from "fs";
import { execSync } from "child_process";

const teardown = async () => {
  try {
    const pid = fs.readFileSync("process_id.txt").toString();

    try {
      if (process.platform === "win32")
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      else execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    } catch {
      // Ignore
    }

    try {
      fs.unlinkSync("process_id.txt");
    } catch {
      // Ignore
    }
  } catch {
    // Ignore
  }
};

export default teardown;
