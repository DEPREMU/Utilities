import windowModule from "../modules/WindowModule";
import { logError } from "./debug";
import { FetchFileInfo } from "@types";

export const fetchFileInfo: FetchFileInfo = async (filePath) => {
  try {
    const fileInfo = await windowModule.getFileInfo(filePath);

    return fileInfo;
  } catch (error) {
    logError(
      "VAULT",
      "Error fetching file info:",
      (error as Error)?.message || error,
    );
    return null;
  }
};
