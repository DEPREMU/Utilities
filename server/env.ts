import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

type Env = {
  HOST: string;
  PORT: number;
  USE_HTTPS: boolean;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  ADMIN_PASSWORD: string;
  EMAIL_APP_SUPABASE: string;
  PASSWORD_APP_SUPABASE: string;
};

const REQUIRED_VARS: (keyof Env)[] = [
  "HOST",
  "PORT",
  "USE_HTTPS",
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "ADMIN_PASSWORD",
  "EMAIL_APP_SUPABASE",
  "PASSWORD_APP_SUPABASE",
];

export const validateServerEnv = () => {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(
        ", ",
      )}. Default values are used where applicable.`,
    );
  }
};

const env: Env = {
  HOST: process.env.HOST || "localhost",
  PORT: Number(process.env.PORT) || 3000,
  USE_HTTPS: process.env.USE_HTTPS === "true" || false,
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  EMAIL_APP_SUPABASE: process.env.EMAIL_APP_SUPABASE || "",
  PASSWORD_APP_SUPABASE: process.env.PASSWORD_APP_SUPABASE || "",
};

export default env;
