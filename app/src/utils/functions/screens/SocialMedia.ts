import { Logger } from "@/utils/TOP_LEVEL";
import { Linking } from "react-native";

const logger = new Logger("FunctionsSocialMedia");

/**
 * Opens the specified URL.
 *
 * @param {string} link - The URL to be opened.
 * @returns {void}
 */
export const openURL = (link: string): void => {
  Linking.openURL(link).catch((err) =>
    logger.error("Failed to open URL:", err),
  );
};
