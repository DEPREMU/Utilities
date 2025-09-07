import { Linking } from "react-native";
import { logError } from "../debug";

/**
 * Opens the specified URL.
 *
 * @param {string} link - The URL to be opened.
 * @returns {void}
 */
export const openURL = (link: string): void => {
  Linking.openURL(link).catch((err) => logError("Failed to open URL:", err));
};
