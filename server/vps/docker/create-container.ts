import fs from "fs";
import path from "path";
import { externalServer } from "@commonSrc/serverOrElectron/build";
import { getAllPathsSync } from "@commonSrc/serverOrElectron/fs";

const { root, server } = getAllPathsSync();

const readPackages = async () => {
  const paths = new Set<string>(["./", "server", "common"]);

  const dependencies: Record<string, string> = {};

  for (const dir of paths) {
    const dirPath = path.join(root, dir);
    const filePath = path.join(dirPath, "package.json");
    const content = await fs.promises.readFile(filePath, "utf-8");
    const packageJson = JSON.parse(content);
    const deps = packageJson.dependencies ?? {};
    Object.assign(dependencies, deps);
  }

  return dependencies;
};

const createPackageJson = async () => {
  const deps = await readPackages();

  const dependencies = Object.fromEntries(
    Object.entries(deps).filter(([key]) => externalServer.includes(key)),
  );

  const packageServer = await fs.promises.readFile(
    path.join(server, "package.json"),
    "utf-8",
  );

  const packageJsonServer = JSON.parse(packageServer);

  packageJsonServer.dependencies = dependencies;
  packageJsonServer.dependencies.prisma =
    packageJsonServer.devDependencies.prisma;
  packageJsonServer.devDependencies = {};

  await fs.promises.writeFile(
    path.join(server, "build", "package.json"),
    JSON.stringify(packageJsonServer, null, 2),
  );
};
createPackageJson();
