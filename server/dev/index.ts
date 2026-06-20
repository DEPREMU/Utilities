import chalk from "chalk";
import { Logger } from "@common";
import { prisma } from "@/database/postgres.ts";
import { createFakeData } from "./createFakeData";
import { RequestAuth, RoutesAPI } from "@types";
import { executeFunctionAfterInit, host, port } from "@/config";

const initDev = async () => {
  const user: RequestAuth<"signup"> = {
    lang: "en",
    email: "test@test.test",
    password: "Test123!",
  };
  try {
    await prisma.users.delete({
      where: { email: user.email },
    });
  } catch {
    // Ignore errors
  }

  const route = "/auth/signup" satisfies RoutesAPI;
  await fetch(`http://${host}:${port}/api${route}`, {
    body: JSON.stringify(user),
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((data) => {
      Logger.log(chalk.blue("Test user signup response:"), data);
    })
    .catch((error) => {
      Logger.error(chalk.red("Error during test user signup:"), error);
    });

  await createFakeData();

  // await runAllTests(true); //TODO: Uncomment this line to run all tests after initialization. Make sure the refactor is completed before doing so, as some tests might fail due to the ongoing refactor.
};

executeFunctionAfterInit(initDev);

export * from "./createFakeData.ts";
