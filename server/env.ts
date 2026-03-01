import dotenv from "dotenv";
import { Env } from "@types";
import { showWarn } from "./functions/logger";

dotenv.config({ path: "../.env" });

const REQUIRED_VARS: (keyof Env)[] = [
  "IV",
  "WS_URL",
  "__DEV__",
  "DB_PORT",
  "DB_USER",
  "DB_PASS",
  "DB_NAME",
  "DB_HOST",
  "API_URL",
  "USE_HTTPS",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "DB_ENCRYPTION_PASS",
  "DEEPL_TRANSLATOR_API",
  "FIREBASE_SERVICE_ACCOUNT",
  "SECRET_KEY_TO_ENCRYPTION",
];

export const validateServerEnv = () => {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    showWarn(
      `Missing environment variables: ${missing.join(
        ", ",
      )}. Default values are used where applicable.`,
    );
  }
  const iv = process.env.IV;

  if (!iv || iv.length !== 16)
    throw new Error("IV must be a valid 16-byte hex string.");
};

const env: Env = {
  __DEV__: process.env.__DEV__ || "false",
  WS_URL: process.env.WS_URL || "ws://localhost:3000/",
  API_URL: process.env.API_URL || "http://localhost:3000/api",
  DB_USER: process.env.DB_USER || "Utilities",
  DB_PORT: process.env.DB_PORT || "5432",
  DB_PASS: process.env.DB_PASS || "fny0a98dfnyacy389yas8dyawef89nywa98fa",
  DB_NAME: process.env.DB_NAME || "UtilitiesDB",
  DB_HOST: process.env.DB_HOST || "localhost",
  USE_HTTPS: process.env.USE_HTTPS || "false",
  JWT_SECRET: process.env.JWT_SECRET || "7rg398cg9savc93q87fvvca08fv",
  BUILD_PROFILE: "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || "",
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
  DB_ENCRYPTION_PASS: process.env.DB_ENCRYPTION_PASS || "",
  DEEPL_TRANSLATOR_API: process.env.DEEPL_TRANSLATOR_API || "",
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT || "",
  SECRET_KEY_TO_ENCRYPTION:
    process.env.SECRET_KEY_TO_ENCRYPTION || "0123456789abcdef0123456789abcdef",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  IV: process.env.IV || "abcdef9876543210",
};

const trueArray = ["true", "1", "yes", "on"];

const envTranslated: Env<true> = {
  IV: env.IV,
  __DEV__: trueArray.includes(env.__DEV__),
  WS_URL: env.WS_URL,
  API_URL: env.API_URL,
  BUILD_PROFILE: env.BUILD_PROFILE as "production",
  DB_USER: env.DB_USER,
  DB_PORT: Number(env.DB_PORT),
  DB_PASS: env.DB_PASS,
  DB_NAME: env.DB_NAME,
  DB_HOST: env.DB_HOST,
  USE_HTTPS: trueArray.includes(env.USE_HTTPS),
  JWT_SECRET: env.JWT_SECRET,
  ADMIN_EMAIL: env.ADMIN_EMAIL,
  ADMIN_PASSWORD: env.ADMIN_PASSWORD,
  VAPID_PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
  DB_ENCRYPTION_PASS: env.DB_ENCRYPTION_PASS,
  DEEPL_TRANSLATOR_API: env.DEEPL_TRANSLATOR_API,
  FIREBASE_SERVICE_ACCOUNT: env.FIREBASE_SERVICE_ACCOUNT,
  SECRET_KEY_TO_ENCRYPTION: env.SECRET_KEY_TO_ENCRYPTION,
};

export const getEnvValue = <T extends keyof Env<true>>(key: T): Env<true>[T] =>
  envTranslated[key];
