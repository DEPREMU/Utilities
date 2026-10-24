import fs from "node:fs";
import path from "node:path";

export interface EnvConfigOptions {
  rootDir?: string;
  nordToken?: string;
}

export const getRootEnvContent = (): string => {
  return [
    "IV=0123456789abcdef",
    "__DEV__=true",
    "USE_HTTPS=false",
    "JWT_SECRET=ci-jwt-secret-key-1234567890abcdef",
    "ADMIN_EMAIL=ci-admin@example.com",
    "ADMIN_PASSWORD=ci-admin-password",
    "DEEPL_TRANSLATOR_API=ci-deepl-key",
    "SECRET_KEY_TO_ENCRYPTION=0123456789abcdef0123456789abcdef",
    "FIREBASE_SERVICE_ACCOUNT={}",
    'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/UtilitiesDB?schema=public"',
    "DB_ENCRYPTION_PASS=ci-db-encryption-pass",
    "WS_URL=ws://localhost:3000/ws",
    "API_URL=http://localhost:3000/api",
    "REDIS_URL=redis://localhost:6379",
    "SMTP_HOST=localhost",
    "SMTP_PORT=587",
    "SMTP_USER=ci-smtp@example.com",
    "SMTP_PASSWORD=ci-smtp-pass",
    "FCM_SERVER_KEY=ci-fcm-key",
    "",
  ].join("\n");
};

export const getDockerEnvContent = (nordToken = ""): string => {
  const lines = [
    "POSTGRES_USER=postgres",
    "POSTGRES_PASS=postgres",
    "POSTGRES_DB=UtilitiesDB",
    'DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/UtilitiesDB?schema=public"',
    'REDIS_URL="redis://127.0.0.1:6379"',
    "IV=0123456789abcdef",
    "__DEV__=false",
    "USE_HTTPS=false",
    "JWT_SECRET=ci-jwt-secret-key-1234567890abcdef",
    "ADMIN_EMAIL=ci-admin@example.com",
    "ADMIN_PASSWORD=ci-admin-password",
    "DEEPL_TRANSLATOR_API=ci-deepl-key",
    "SECRET_KEY_TO_ENCRYPTION=0123456789abcdef0123456789abcdef",
    "FIREBASE_SERVICE_ACCOUNT={}",
    "DB_ENCRYPTION_PASS=ci-db-encryption-pass",
    "WS_URL=ws://localhost:3000/ws",
    "API_URL=http://localhost:3000/api",
    "SMTP_HOST=localhost",
    "SMTP_PORT=587",
    "SMTP_USER=ci-smtp@example.com",
    "SMTP_PASSWORD=ci-smtp-pass",
    "FCM_SERVER_KEY=ci-fcm-key",
    "DOWNLOAD_RATE_LIMIT=5m",
  ];

  if (nordToken) {
    lines.push(`NORD_TOKEN=${nordToken}`);
  }

  lines.push("");
  return lines.join("\n");
};

export const setupCiEnvironment = (
  target: "all" | "root" | "docker" = "all",
  options: EnvConfigOptions = {},
): void => {
  const rootDir = options.rootDir ?? process.cwd();
  const nordToken = options.nordToken ?? process.env.NORD_TOKEN ?? "";

  if (target === "all" || target === "root") {
    const rootEnvPath = path.join(rootDir, ".env");
    fs.writeFileSync(rootEnvPath, getRootEnvContent(), "utf8");
    // eslint-disable-next-line no-console
    console.log(`[setup-ci-env] Configured root environment: ${rootEnvPath}`);
  }

  if (target === "all" || target === "docker") {
    const dockerDir = path.join(rootDir, "server", "vps", "docker");
    if (!fs.existsSync(dockerDir)) {
      fs.mkdirSync(dockerDir, { recursive: true });
    }

    const dockerEnvPath = path.join(dockerDir, ".env");
    fs.writeFileSync(dockerEnvPath, getDockerEnvContent(nordToken), "utf8");
    // eslint-disable-next-line no-console
    console.log(
      `[setup-ci-env] Configured Docker environment: ${dockerEnvPath} (NordVPN token: ${nordToken ? "provided" : "empty"})`,
    );

    const whatsappDirs = [
      path.join(rootDir, "server", ".temp", "whatsapp-shared-session"),
      path.join(rootDir, ".temp", "whatsapp-shared-session"),
    ];

    whatsappDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    // eslint-disable-next-line no-console
    console.log("[setup-ci-env] Created temporary session directories.");
  }
};

if (process.env.NODE_ENV !== "test") {
  const args = process.argv.slice(2);
  let target: "all" | "root" | "docker" = "all";

  for (const arg of args) {
    if (arg.startsWith("--target=")) {
      const val = arg.split("=")[1].toLowerCase();
      if (val === "root" || val === "docker" || val === "all") {
        target = val;
      }
    }
  }

  try {
    setupCiEnvironment(target);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[setup-ci-env] Error configuring CI environment:", err);
    process.exit(1);
  }
}
