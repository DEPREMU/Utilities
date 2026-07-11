import fs from "fs";
import path from "path";
import prettier from "prettier";
import { Logger } from "@commonSrc/serverOrElectron/logger.ts";
import { UTILITIES_PATH } from "./config.ts";
import { Directory, File } from "@commonSrc/serverOrElectron/fs.ts";

const validExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".mdx",
];

const exclude = fs
  .readFileSync(path.join(UTILITIES_PATH, ".gitignore"), "utf-8")
  .split("\n")
  .map((line) => line.replace(/\/$/, ""))
  .filter((line) => line && !line.startsWith("#"));

const isValidFileExtension = (fileName: string): boolean => {
  return validExtensions.includes(path.extname(fileName));
};

const isExcludedPath = (filePath: string): boolean => {
  return exclude.some((excludedPath) => filePath.includes(excludedPath));
};

export const formatFolder = async (
  localPath: string,
  prettierConfig?: prettier.Options,
  first: boolean = true,
): Promise<number> => {
  const dir = new Directory(localPath);
  if (!(await dir.exists()))
    throw new Error(`Path does not exist: ${localPath}`);

  const files = await dir.readDir();
  const prettierFile = files.find(
    (file) => file === ".prettierrc" || file === ".prettierrc.json",
  );
  if (prettierFile) {
    const configPath = path.join(localPath, prettierFile);
    const configContent = await new File(configPath).readFile("utf-8");
    prettierConfig = JSON.parse(configContent) as prettier.Options;
  }
  Logger.log(`Using Prettier config: ${JSON.stringify(prettierConfig)}`);

  let formattedFiles = 0;
  await Promise.all(
    files.map(async (_filename) => {
      const file = new File(path.join(localPath, _filename));

      const stats = await file.stats();

      if (isExcludedPath(file.path) || !stats) return;
      Logger.log(`Formatting: ${file.path}`);
      if (stats.isDirectory()) {
        return await formatFolder(file.path, prettierConfig, false);
      } else if (stats.isFile() && isValidFileExtension(file.path)) {
        const content = await file.readFile("utf-8");
        const formattedContent = await prettier.format(
          content,
          prettierConfig || {
            filepath: file.path,
            endOfLine: "lf",
          },
        );
        await file.writeFile(formattedContent, "utf-8");
        formattedFiles++;
      }
    }),
  );
  if (first) {
    Logger.log(`Total formatted files: ${formattedFiles}`);
  }
  return formattedFiles;
};
