import path from "path";
import chalk from "chalk";
import { exec } from "child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnvValue } from "@/env";
import { getDbConfig } from "./functions";
import { PrismaClient } from "@/generated/prisma";
import { ExecuteOnce, File } from "@common";

if (!getEnvValue("DATABASE_URL")) {
  throw new Error(
    chalk.red("DATABASE_URL is not defined in environment variables"),
  );
}

ExecuteOnce.execute("Create pgpass file", undefined, () => {
  const { username, password, hostname, port, database } = getDbConfig();

  const pgpass = `${hostname}:${port}:${database}:${username}:${password}`;

  const isWindows = process.platform === "win32";

  let pgpassFilePath: string;
  if (isWindows) {
    if (!process.env.APPDATA)
      throw new Error("APPDATA environment variable is not defined");
    pgpassFilePath = path.join(
      process.env.APPDATA,
      "postgresql",
      "pgpass.conf",
    );
    new File(pgpassFilePath).writeFile(pgpass, { mode: 0o600 });
  } else {
    pgpassFilePath = "~/.pgpass";
    exec(`echo "${pgpass}" > ${pgpassFilePath} && chmod 600 ${pgpassFilePath}`);
  }
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
