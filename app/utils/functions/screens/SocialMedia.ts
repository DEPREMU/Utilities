import { logger } from "../debug";
import { Linking } from "react-native";

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
