/**
 * Cleans a float string by removing unnecessary zeros and formatting it.
 *
 * @param text - The float string to clean.
 * @returns The cleaned float string.
 */
export const cleanFloat = (text: string): string => {
  let cleaned = text.replace(/[^0-9.]/g, "");

  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts.shift() + "." + parts.join("");
  }

  while (cleaned.length > 1 && cleaned.startsWith("0") && cleaned[1] !== ".") {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith(".")) {
    cleaned = "0" + cleaned;
  }

  return cleaned || "0";
};

export class Validations {
  /**
   * Validates whether a given string is a properly formatted email address.
   *
   * @param email - The email address to validate.
   * @returns `true` if the email address is valid, otherwise `false`.
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates if a given password meets the required criteria.
   *
   * The password must:
   * - Be at least 8 characters long.
   * - Contain at least one letter (uppercase and lowercase).
   * - Contain at least one numeric digit.
   * - Contain at least one special character (e.g., !@#$%^&*).
   *
   * @param password - The password string to validate.
   * @returns `true` if the password is valid, otherwise `false`.
   */
  static isValidPassword(password: string): boolean {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Calculates a numeric representation of a version string for comparison purposes.
   *
   * The version string should be in the format "major.minor.patch" (e.g., "1.2.3").
   * The numeric representation is calculated as:
   * (major * 1000000) + (minor * 1000) + patch
   *
   * @param version - The version string to convert.
   * @returns A numeric representation of the version, or 0 if the version is invalid.
   */
  static getSumVersion(version: string): number {
    try {
      const versionSum = version
        .split(".")
        .map((num) => {
          let number = Number(num);
          if (isNaN(number)) {
            // Handle cases like "1.0.0-beta"
            const match = num.match(/^(\d+)/);

            if (match) number = Number(match[1]);
            else return 0;
          }
          return number;
        })
        .reduce(
          (sum, part, index) => sum + part * Math.pow(1000, 2 - index),
          0,
        );
      return isNaN(versionSum) ? 0 : versionSum;
    } catch {
      return 0;
    }
  }

  /**
   * Checks if a new version is available.
   *
   * @param currentVersion - The current version string.
   * @param latestVersion - The latest version string.
   * @returns `true` if the latest version is newer than the current version, otherwise `false`.
   */
  static isNewVersion(currentVersion: string, latestVersion: string): boolean {
    return (
      Validations.getSumVersion(latestVersion) >
      Validations.getSumVersion(currentVersion)
    );
  }

  /**
   * Validates whether a given push token is valid.
   *
   * A valid push token is defined as a string that:
   * - Is not equal to "Web".
   * - Has a length greater than 10 characters after trimming whitespace.
   */
  static isValidPushToken(token: string): boolean {
    return token !== "Web" && token.trim().length > 10;
  }
}
