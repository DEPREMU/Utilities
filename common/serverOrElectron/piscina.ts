import path from "path";
import { WorkerFiles } from "@types";

export const PiscinaWorkerFiles: Record<WorkerFiles, string> = {
  IMAGES: "images.worker.cjs",
  ENCRYPTION: "encryption.worker.cjs",
  GET_LOCAL_IP: "getLocalIP.worker.cjs",
};

export const getPiscinaWorkerPath = (worker: WorkerFiles) => {
  try {
    return path.join(
      __dirname ?? path.resolve(),
      "piscina",
      PiscinaWorkerFiles[worker],
    );
  } catch {
    return path.join(path.resolve(), "piscina", PiscinaWorkerFiles[worker]);
  }
};
