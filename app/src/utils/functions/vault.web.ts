import { logger } from "./debug";
import { windowModule } from "@modules";
import { FetchFileInfo } from "@types";

export const fetchFileInfo: FetchFileInfo = async (filePath) => {
  try {
    const fileInfo = await windowModule.getFileInfo(filePath);

    return fileInfo;
  } catch (error) {
    logger.error(
      "VAULT",
      "Error fetching file info:",
      (error as Error)?.message || error,
    );
    return null;
  }
};
