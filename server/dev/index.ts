import chalk from "chalk";
import { user } from "./utils";
import { config } from "@/config";
import { prisma } from "@/database/postgres";
import { createFakeData } from "./createFakeData";
import { Logger, ServerFetch } from "@common";

const logger = new Logger("InitDev");

const initDev = async () => {
  const count = await prisma.users.count({ where: { email: user.email } });

  if (count === 0) {
    const res = await ServerFetch.post("/auth/signup", {
      body: {
        lang: "en",
        email: user.email,
        password: user.password,
      },
    });

    logger.log(chalk.green("Test user created:"), res);
  }

  await createFakeData();
};

config.executeFunctionAfterInit(initDev);

export * from "./createFakeData";
