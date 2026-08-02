import { REPLACERS } from "@common";
import { windowModule } from "@modules";
import { FetchFileInfo } from "@types";

export const fetchFileInfo: FetchFileInfo = async (filePath) => {
  try {
    const fileInfo = await windowModule.getFileInfo(filePath);

    return fileInfo;
  } catch (error) {
    REPLACERS.Logger.error(
      "VAULT",
      "Error fetching file info:",
      (error as Error)?.message || error,
    );
    return null;
  }
};

export const getImageFromVideo = async () => null;
