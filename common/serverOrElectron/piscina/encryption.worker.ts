import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { EncryptionWorkerData } from "@types";

let PATH = path.resolve();
while (!PATH.endsWith("Utilities")) PATH = path.dirname(PATH);

const ENV_SECRET_KEY = process.env.SECRET_KEY_TO_ENCRYPTION;
const ENV_IV = process.env.IV;
if (!ENV_SECRET_KEY) {
  throw new Error(
    "Environment variable SECRET_KEY_TO_ENCRYPTION is not set. Please set it to a secure value.",
  );
}
if (!ENV_IV) {
  throw new Error(
    "Environment variable IV is not set. Please set it to a secure value.",
  );
}

const pbkdf2Async = promisify(crypto.pbkdf2);

/**
 * The secret key used for encryption and decryption operations.
 *
 * This value is retrieved from the environment variable `SECRET_KEY_TO_ENCRYPTION`.
 * If the environment variable is not set, a default 32-character hexadecimal string is used.
 *
 * @remarks
 * - Ensure that the secret key is kept secure and not exposed in version control.
 * - The default value is intended for development purposes only and should be overridden in production.
 */
const SECRET_KEY = crypto.scryptSync(ENV_SECRET_KEY, "salt", 32);

/**
 * Initialization Vector (IV) used for encryption algorithms.
 *
 * The value is retrieved from the environment variable `IV` if set,
 * otherwise it defaults to "abcdef9876543210".
 *
 * @remarks
 * The IV should be a unique and unpredictable value for each encryption operation
 * to ensure security. Using a static or predictable IV can compromise the security
 * of the encrypted data.
 */
const IV = Buffer.from(ENV_IV, "utf-8");

/**
 * The encryption algorithm used for cryptographic operations.
 *
 * Uses AES (Advanced Encryption Standard) with a 256-bit key in CBC (Cipher Block Chaining) mode.
 * This algorithm provides a strong level of security for encrypting sensitive data.
 *
 * @see {@link https://nodejs.org/api/crypto.html#crypto_crypto_createcipheriv_algorithm_key_iv}
 */
const algorithm = "aes-256-cbc";

/**
 * Encrypts a given plaintext string using a symmetric encryption algorithm.
 *
 * @param text - The plaintext string to be encrypted.
 * @returns The encrypted text encoded in base64 format.
 *
 * @remarks
 * This function uses the specified `algorithm`, `SECRET_KEY`, and `IV` to create a cipher.
 * The input text is encrypted and the result is returned as a base64-encoded string.
 */
export const encryptText = (data: { text: string }): string | Error => {
  try {
    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(SECRET_KEY),
      Buffer.from(IV),
    );
    let encrypted = cipher.update(data.text, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Decrypts a given base64-encoded encrypted text using the specified algorithm, secret key, and initialization vector (IV).
 *
 * @param encryptedText - The encrypted string in base64 format to be decrypted.
 * @returns The decrypted plain text string.
 *
 * @throws {Error} If decryption fails due to invalid input or configuration.
 */
export const decryptText = (data: { text: string }): string | Error => {
  try {
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(SECRET_KEY),
      Buffer.from(IV),
    );
    let decrypted = decipher.update(data.text, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
};

const deriveKey = async (password: string, salt: Buffer): Promise<Buffer> => {
  return (await pbkdf2Async(password, salt, 100000, 32, "sha256")) as Buffer;
};

export const decryptFile = async ({
  password,
  inputPath,
  outputPath,
}: EncryptionWorkerData) => {
  const headerBuffer = Buffer.alloc(44);
  const fd = await fs.promises.open(inputPath, "r");

  const { bytesRead } = await fd.read(headerBuffer, 0, 44, 0);
  if (bytesRead < 44) return false;

  await fd.close();

  const salt = headerBuffer.subarray(0, 16);
  const iv = headerBuffer.subarray(16, 28);
  const authTag = headerBuffer.subarray(28, 44);

  const key = await deriveKey(password, salt);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const input = fs.createReadStream(inputPath, { start: 44 });
  const output = fs.createWriteStream(outputPath);

  await pipeline(input, decipher, output);
  return true;
};

export const encryptFile = async ({
  password,
  inputPath,
  outputPath,
}: EncryptionWorkerData) => {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  const key = await deriveKey(password, salt);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  output.write(salt);
  output.write(iv);

  const tagPlaceholder = Buffer.alloc(16, 0);
  output.write(tagPlaceholder);

  await pipeline(input, cipher, output);

  const authTag = cipher.getAuthTag();

  const fd = await fs.promises.open(outputPath, "r+");
  try {
    await fd.write(authTag, 0, 16, 28);
  } finally {
    await fd.close();
  }

  return true;
};
