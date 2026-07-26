import { getEnvValue } from "@/env";
import chalk from "chalk";

export const getDbConfig = () => {
  //? "postgresql://username:password@hostname:port/database"
  const dburl = getEnvValue("DATABASE_URL");
  const dburlRegex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = dburl.match(dburlRegex);

  if (!match) {
    throw new Error(
      chalk.red(
        "DATABASE_URL is not in the correct format. Expected format: postgresql://username:password@hostname:port/database",
      ),
    );
  }

  const [, username, password, hostname, port, database] = match;

  return {
    port,
    username,
    password,
    hostname,
    database: database.split("?")[0],
  };
};
