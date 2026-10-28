import fs from "node:fs";
import path from "node:path";

export interface EnvConfigOptions {
  rootDir?: string;
  openVPN?: {
    user: string;
    pass: string;
  };
}

const FCM_SERVER_KEY = `FIREBASE_SERVICE_ACCOUNT='{"type":"<TYPE>","project_id":"<PROJECT_ID>","private_key_id":"<PRIVATE_KEY_ID>","private_key":"<PRIVATE_KEY>","client_email":"<CLIENT_EMAIL>","client_id":"<CLIENT_ID>","auth_uri":"<AUTH_URI>","token_uri":"<TOKEN_URI>","auth_provider_x509_cert_url":"<AUTH_PROVIDER_X509_CERT_URL>","client_x509_cert_url":"<CLIENT_X509_CERT_URL>","universe_domain":"<UNIVERSE_DOMAIN>"}'`;

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
    FCM_SERVER_KEY,
    "",
  ].join("\n");
};

export const getDockerEnvContent = (
  openVPN: EnvConfigOptions["openVPN"],
): string => {
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
    FCM_SERVER_KEY,
    "DOWNLOAD_RATE_LIMIT=5m",
  ];

  if (openVPN?.user && openVPN.pass) {
    lines.push(`OPENVPN_USER=${openVPN.user}`);
    lines.push(`OPENVPN_PASSWORD=${openVPN.pass}`);
  }

  lines.push("");
  return lines.join("\n");
};

export const setupCiEnvironment = (
  target: "all" | "root" | "docker" = "all",
  options: EnvConfigOptions = {},
): void => {
  const rootDir = options.rootDir ?? process.cwd();
  const openVPN = options.openVPN ?? {
    user: process.env.OPENVPN_USER || "",
    pass: process.env.OPENVPN_PASSWORD || "",
  };

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
    fs.writeFileSync(dockerEnvPath, getDockerEnvContent(openVPN), "utf8");
    // eslint-disable-next-line no-console
    console.log(
      `[setup-ci-env] Configured Docker environment: ${dockerEnvPath} (OpenVPN credentials: ${openVPN.user && openVPN.pass ? "provided" : "empty"})`,
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
