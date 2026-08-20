import chalk from "chalk";
import { user } from "./utils.ts";
import { prisma } from "@/database/postgres.ts";
import { createFakeData } from "./createFakeData";
import { Logger, ServerFetch } from "@common";
import { executeFunctionAfterInit } from "@/config";

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

    Logger.log(chalk.green("Test user created:"), res);
  }

  await createFakeData();
};

executeFunctionAfterInit(initDev);

export * from "./createFakeData.ts";
