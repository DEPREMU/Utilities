import crypto from "node:crypto";
import { getEnvValue } from "../env.ts";

const CODE_LENGTH = 8;
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 *
 * @param email - The raw email address string
 * @returns The normalized email address
 */
export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Generates a cryptographically secure 8-character uppercase alphanumeric verification code.
 * Excludes ambiguous characters (0, O, 1, I).
 *
 * @param length - The length of the verification code, defaults to 8
 * @returns The generated 8-character verification code
 */
export const generateAuthCode = (length = CODE_LENGTH): string => {
  let result = "";
  const alphabetLength = CODE_ALPHABET.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, alphabetLength);
    result += CODE_ALPHABET[randomIndex];
  }

  return result;
};

/**
 * Computes an HMAC-SHA-256 hex digest for an authentication code using the server secret.
 *
 * @param code - The verification code to hash
 * @returns The HMAC-SHA-256 hash as a hex string
 */
export const hashAuthCode = (code: string): string => {
  const secret = getEnvValue("JWT_SECRET") || "utilities-default-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(code.trim().toUpperCase())
    .digest("hex");
};

/**
 * Verifies a candidate verification code against a stored HMAC-SHA-256 hash in constant time.
 *
 * @param candidateCode - The code submitted by the user
 * @param storedHash - The stored HMAC-SHA-256 hash from Redis
 * @returns True if the candidate code matches the stored hash, false otherwise
 */
export const verifyAuthCode = (
  candidateCode: string,
  storedHash: string,
): boolean => {
  if (!candidateCode || !storedHash) {
    return false;
  }

  const candidateHash = hashAuthCode(candidateCode);
  const candidateBuffer = Buffer.from(candidateHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
};
