import { Linking } from "react-native";
import { REPLACERS } from "@common";

/**
 * Opens the specified URL.
 *
 * @param {string} link - The URL to be opened.
 * @returns {void}
 */
export const openURL = (link: string): void => {
  Linking.openURL(link).catch((err) =>
    REPLACERS.Logger.error("Failed to open URL:", err),
  );
};
