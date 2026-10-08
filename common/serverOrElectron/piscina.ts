import fs from "fs";
import path from "path";
import { WorkerFiles } from "@types";

let mainPath = process.cwd();
try {
  mainPath = __dirname;
} catch {
  // Ignore
}

let exists = false;
let attempts = 3;

export const PiscinaWorkerFiles: Record<WorkerFiles, string> = {
  IMAGES: "images.worker.js",
  ENCRYPTION: "encryption.worker.js",
  GET_LOCAL_IP: "getLocalIP.worker.js",
};

export const getPiscinaWorkerPath = (worker: WorkerFiles) => {
  if (!exists) {
    while (attempts-- > 0) {
      if (fs.existsSync(path.join(mainPath, "piscina"))) {
        exists = true;
        break;
      }

      mainPath = path.dirname(mainPath);
    }
    if (!exists) throw new Error("Piscina worker directory not found!");
  }

  return path.join(mainPath, "piscina", PiscinaWorkerFiles[worker]);
};
