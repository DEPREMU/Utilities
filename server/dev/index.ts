import chalk from "chalk";
import { user } from "./utils.ts";
import { prisma } from "@/database/postgres.ts";
import { runAllTests } from "./testingRoutes/index.ts";
import { createFakeData } from "./createFakeData";
import { Logger, ServerFetch } from "@common";
import { executeFunctionAfterInit } from "@/config";

const initDev = async () => {
  const filePath = "./test.ts";
  await import(filePath).then(({ testing }) => testing()).catch(() => {});

  try {
    await prisma.users.delete({
      where: { email: user.email },
    });
  } catch {
    // Ignore errors
  }

  const res = await ServerFetch.post("/auth/signup", {
    body: {
      lang: "en",
      email: user.email,
      password: user.password,
    },
  });

  Logger.log(chalk.green("Test user created:"), res);

  await createFakeData();

  await runAllTests(true);
};

executeFunctionAfterInit(initDev);

export * from "./createFakeData.ts";
