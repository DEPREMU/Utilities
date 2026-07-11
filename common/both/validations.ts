/**
 * Validates whether a given string is a properly formatted email address.
 *
 * @param email - The email address to validate.
 * @returns `true` if the email address is valid, otherwise `false`.
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates if a given password meets the required criteria.
 *
 * The password must:
 * - Be at least 8 characters long.
 * - Contain at least one letter (uppercase or lowercase).
 * - Contain at least one numeric digit.
 *
 * @param password - The password string to validate.
 * @returns `true` if the password is valid, otherwise `false`.
 */
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/;
  return passwordRegex.test(password);
};

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

export const getSumVersion = (version: string): number => {
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
      .reduce((sum, part, index) => sum + part * Math.pow(1000, 2 - index), 0);
    return isNaN(versionSum) ? 0 : versionSum;
  } catch {
    return 0;
  }
};

export const isNewVersion = (
  currentVersion: string,
  latestVersion: string,
): boolean => {
  return getSumVersion(latestVersion) > getSumVersion(currentVersion);
};
