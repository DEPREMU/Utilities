import React from "react";
import { isEqual } from "lodash";

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
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Cleans a float string by removing unnecessary zeros and formatting it.
 *
 * @param text - The float string to clean.
 * @returns The cleaned float string.
 */
export const cleanFloat = (text: string): string => {
  let cleanedText = "";
  const lenText = text.length;
  for (let i = 0; i < lenText; i++) {
    const char = text[i];
    if (char === "0" && text[i + 1] === ".") continue;
    if (
      char === "0" &&
      (Number(text[i + 1] || "0") === 0 || Number(text[i + 1]) > 0)
    )
      continue;
    if (char === "." && cleanedText.includes(".")) continue;
    if (char === "." && Number(text.slice(i)) === 0) continue;
    cleanedText += char;
  }
  if (!cleanedText) cleanedText = "0";
  if (cleanedText.startsWith(".")) cleanedText = "0" + cleanedText;

  return cleanedText;
};

/**
 * Compares two sets of children and determines if they are equal.
 *
 * @param prevChildren - The previous set of children.
 * @param nextChildren - The next set of children.
 * @returns `true` if the children are equal, otherwise `false`.
 */
export const areEqualChildren = (
  prevChildren: React.ReactNode,
  nextChildren: React.ReactNode,
): boolean => {
  return isEqual(prevChildren, nextChildren);
};
