import { Logger } from "../TOP_LEVEL";
import { windowModule } from "@modules";
import { FetchFileInfo } from "@types";

const logger = new Logger("FunctionsVaultWeb");

export const fetchFileInfo: FetchFileInfo = async (filePath) => {
  try {
    const fileInfo = await windowModule.file.getInfo(filePath);

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

export const getImageFromVideo = async () => null;
