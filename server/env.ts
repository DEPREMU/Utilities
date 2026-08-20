import dotenv from "dotenv";
import { Env } from "@types";
import { Logger, REPLACERS } from "@common";

dotenv.config({ path: "../.env" });

const REQUIRED_VARS: (keyof Env)[] = [
  "IV",
  "WS_URL",
  "__DEV__",
  "API_URL",
  "USE_HTTPS",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "DATABASE_URL",
  "ADMIN_PASSWORD",
  "DB_ENCRYPTION_PASS",
  "DEEPL_TRANSLATOR_API",
  "FIREBASE_SERVICE_ACCOUNT",
  "SECRET_KEY_TO_ENCRYPTION",
];

export const validateServerEnv = () => {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    Logger.warn(
      `Missing environment variables: ${missing.join(
        ", ",
      )}. Default values are used where applicable.`,
    );
  }
  const iv = process.env.IV;

  if (!iv || iv.length !== 16)
    throw new Error(
      "IV must be a valid 16-byte hex string. " + iv + " " + iv?.length,
    );
};

const env: Env = {
  __DEV__: process.env.__DEV__ || "false",
  WS_URL: process.env.WS_URL || "ws://localhost:3000/",
  API_URL: process.env.API_URL || "http://localhost:3000/api",
  USE_HTTPS: process.env.USE_HTTPS || "false",
  JWT_SECRET: process.env.JWT_SECRET || "7rg398cg9savc93q87fvvca08fv",
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://user:password@localhost/db",
  BUILD_PROFILE: "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  DB_ENCRYPTION_PASS: process.env.DB_ENCRYPTION_PASS || "",
  DEEPL_TRANSLATOR_API: process.env.DEEPL_TRANSLATOR_API || "",
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT || "",
  SECRET_KEY_TO_ENCRYPTION:
    process.env.SECRET_KEY_TO_ENCRYPTION || "0123456789abcdef0123456789abcdef",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  IV: process.env.IV || "abcdef9876543210",
  TYPE_BUILD: (process.env.TYPE_BUILD as Env["TYPE_BUILD"]) || "normal",
};

const trueArray = new Set(["true", "1", "yes", "on"]);

const envTranslated: Env<true> = {
  IV: env.IV,
  WS_URL: env.WS_URL,
  API_URL: env.API_URL,
  __DEV__: REPLACERS.isDev,
  USE_HTTPS: trueArray.has(env.USE_HTTPS),
  JWT_SECRET: env.JWT_SECRET,
  TYPE_BUILD: env.TYPE_BUILD,
  ADMIN_EMAIL: env.ADMIN_EMAIL,
  DATABASE_URL: env.DATABASE_URL,
  BUILD_PROFILE: env.BUILD_PROFILE,
  ADMIN_PASSWORD: env.ADMIN_PASSWORD,
  DB_ENCRYPTION_PASS: env.DB_ENCRYPTION_PASS,
  DEEPL_TRANSLATOR_API: env.DEEPL_TRANSLATOR_API,
  FIREBASE_SERVICE_ACCOUNT: env.FIREBASE_SERVICE_ACCOUNT,
  SECRET_KEY_TO_ENCRYPTION: env.SECRET_KEY_TO_ENCRYPTION,
};

export const getEnvValue = <T extends keyof Env<true>>(key: T): Env<true>[T] =>
  envTranslated[key];
