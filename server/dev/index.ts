import chalk from "chalk";
import { Logger } from "@common";
import { runAllTests } from "@/dev/testingRoutes/index.ts";
import { deleteInTable } from "@/database/functions";
import { createFakeData } from "./createFakeData";
import { RequestAuth, RoutesAPI } from "@types";
import { executeFunctionAfterInit, host, port } from "@/config";

const initDev = async () => {
  const user: RequestAuth<"signup"> = {
    lang: "en",
    email: "test@test.test",
    password: "Test123!",
  };
  await deleteInTable("", "Users", {
    email: user.email,
  });

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

  await runAllTests(true);
};

executeFunctionAfterInit(initDev);

export * from "./handleDoQuery.ts";
export * from "./createFakeData.ts";
