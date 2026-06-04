import fs from "fs";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { EncryptionWorkerData } from "@types";

const pbkdf2Async = promisify(crypto.pbkdf2);

const deriveKey = async (password: string, salt: Buffer): Promise<Buffer> => {
  return (await pbkdf2Async(password, salt, 100000, 32, "sha256")) as Buffer;
};

export const decrypt = async ({
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

export const encrypt = async ({
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
